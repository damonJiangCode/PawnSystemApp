import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { ClientRepository } from '../client/client.repository.js';
import { EmployeeRepository } from '../employee/employee.repository.js';
import { HolidayRepository } from '../reference/holidays/holiday.repository.js';
import {
  SHOP_TIME_ZONE,
  getEarliestPickupDate,
  toShopDateKey,
} from './ticket-finance.js';
import type { TicketRecord } from './ticket.mapper.js';
import { TicketRepository } from './ticket.repository.js';

export const ticketNotFound = (ticketNumber?: number) =>
  new NotFoundException({
    field: 'ticket_number',
    message: ticketNumber
      ? `Ticket #${ticketNumber} was not found.`
      : 'No ticket was found for that ticket number.',
  });

export const ticketConflict = (message: string, field = 'ticket_number') =>
  new ConflictException({ field, message });

const signatureDateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: SHOP_TIME_ZONE,
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
});

/** MM-DD-YYYY, the date format of signed client note entries. */
export const signatureDate = (date: Date) =>
  signatureDateFormat.format(date).replaceAll('/', '-');

// Checks shared by the ticket services. Every method that takes a connection
// runs inside the caller's transaction.
@Injectable()
export class TicketSupport {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly clients: ClientRepository,
    private readonly employees: EmployeeRepository,
    private readonly holidays: HolidayRepository,
  ) {}

  async loadHolidayDateKeys() {
    const holidays = await this.holidays.loadHolidayDates();
    return holidays.map((holiday) => holiday.holiday_date);
  }

  /**
   * Adds the legal release hold. It is reported for every status, including
   * picked-up tickets paid before the item may be released; it never blocks.
   */
  withPickupWindow(
    ticket: TicketRecord,
    holidayDateKeys: string[],
    today = toShopDateKey(new Date()),
  ) {
    const earliestPickupDate = getEarliestPickupDate(
      ticket.transaction_datetime,
      holidayDateKeys,
    );
    return {
      ...ticket,
      earliest_pickup_date: earliestPickupDate,
      pickup_allowed: today >= earliestPickupDate,
    };
  }

  async present(tickets: TicketRecord[]) {
    const holidayDateKeys = await this.loadHolidayDateKeys();
    const today = toShopDateKey(new Date());
    return tickets.map((ticket) =>
      this.withPickupWindow(ticket, holidayDateKeys, today),
    );
  }

  async requireTicketForUpdate(ticketNumber: number, connection: PoolClient) {
    const ticket = await this.tickets.loadForUpdate(ticketNumber, connection);
    if (!ticket) throw ticketNotFound();
    return ticket;
  }

  async reload(ticketNumber: number, connection: PoolClient) {
    const ticket = await this.tickets.loadByTicketNumber(
      ticketNumber,
      connection,
    );
    if (!ticket)
      throw new Error(`Ticket #${ticketNumber} vanished in a transaction.`);
    return ticket;
  }

  async assertClientActive(clientNumber: number, connection: PoolClient) {
    const client = await this.clients.lockForTicket(clientNumber, connection);
    if (!client) throw new NotFoundException('Client not found.');
    if (!client.is_active) {
      throw new ConflictException(
        'Deactivated clients cannot issue, convert or transfer tickets. Reactivate the client first.',
      );
    }
  }

  // A ticket may keep a location that was deactivated after it was issued.
  async assertLocation(
    location: string,
    connection: PoolClient,
    currentLocation?: string,
  ) {
    if (location === currentLocation) return;
    if (!(await this.tickets.isLocationActive(location, connection))) {
      throw new BadRequestException({
        field: 'location',
        message: 'Select a valid location from the list.',
      });
    }
  }

  async requireEmployee(password: string, connection: PoolClient) {
    const employee = await this.employees.findActiveByPassword(
      password,
      connection,
    );
    if (!employee) {
      throw new BadRequestException({
        field: 'employee_password',
        message: 'Employee password is incorrect.',
      });
    }
    return employee;
  }

  /** Name recorded on tickets: nickname, or first name when it is blank. */
  async ticketEmployeeName(password: string, connection: PoolClient) {
    const employee = await this.requireEmployee(password, connection);
    return employee.nickname.trim() || employee.first_name;
  }

  /** Appends `entry (FIRST_NAME, MM-DD-YYYY)` to the client's notes. */
  async signClientNote(
    clientNumber: number,
    entry: string,
    employeeFirstName: string,
    at: Date,
    connection: PoolClient,
  ) {
    await this.clients.appendNote(
      clientNumber,
      `${entry} (${employeeFirstName}, ${signatureDate(at)})`,
      connection,
    );
  }
}
