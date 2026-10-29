import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';
import { ClientRepository } from '../client/client.repository.js';
import { inTransaction } from '../common/transaction.js';
import { EmployeeRepository } from '../employee/employee.repository.js';
import { HolidayRepository } from '../reference/holidays/holiday.repository.js';
import type { CreatePawnTicketDto, CreateSellTicketDto } from './ticket.dto.js';
import {
  getEarliestPickupDate,
  getPawnDueDatetime,
  getSellDueDatetime,
  toShopDateKey,
} from './ticket-finance.js';
import type { TicketRecord } from './ticket.mapper.js';
import { TicketRepository } from './ticket.repository.js';

const ticketNotFound = () =>
  new NotFoundException({
    field: 'ticket_number',
    message: 'No ticket was found for that ticket number.',
  });

@Injectable()
export class TicketService {
  constructor(
    private readonly pool: Pool,
    private readonly tickets: TicketRepository,
    private readonly clients: ClientRepository,
    private readonly employees: EmployeeRepository,
    private readonly holidays: HolidayRepository,
  ) {}

  async listByClient(clientNumber: number) {
    const [tickets, holidayDateKeys] = await Promise.all([
      this.tickets.loadByClientNumber(clientNumber),
      this.loadHolidayDateKeys(),
    ]);
    const today = toShopDateKey(new Date());
    return tickets.map((ticket) =>
      withPickupWindow(ticket, holidayDateKeys, today),
    );
  }

  async findByNumber(ticketNumber: number) {
    const [ticket, holidayDateKeys] = await Promise.all([
      this.tickets.loadByTicketNumber(ticketNumber),
      this.loadHolidayDateKeys(),
    ]);
    if (!ticket) throw ticketNotFound();
    const client = await this.clients.loadByNumber(ticket.client_number);
    if (!client) throw ticketNotFound();
    return {
      ticket: withPickupWindow(
        ticket,
        holidayDateKeys,
        toShopDateKey(new Date()),
      ),
      client,
    };
  }

  createPawn(input: CreatePawnTicketDto) {
    return this.issue(input, (now) => ({
      status: 'pawned',
      due_date: getPawnDueDatetime(now),
      onetime_fee: input.onetime_fee,
    }));
  }

  createSell(input: CreateSellTicketDto) {
    return this.issue(input, (now) => ({
      status: 'sold',
      due_date: getSellDueDatetime(now),
      onetime_fee: 0,
    }));
  }

  // Shared pawn/sell issuing: client lock, location and PIN checks, insert,
  // and the sell counter all commit or roll back together.
  private async issue(
    input: CreatePawnTicketDto | CreateSellTicketDto,
    terms: (
      now: Date,
    ) => Pick<TicketRecord, 'status' | 'due_date' | 'onetime_fee'>,
  ) {
    const holidayDateKeys = await this.loadHolidayDateKeys();
    const ticket = await inTransaction(this.pool, async (connection) => {
      await this.assertClientCanIssue(input.client_number, connection);
      if (!(await this.tickets.isLocationActive(input.location, connection))) {
        throw new BadRequestException({
          field: 'location',
          message: 'Select a valid location from the list.',
        });
      }
      const employeeName = await this.employeeName(
        input.employee_password,
        connection,
      );
      const now = new Date();
      const { status, due_date, onetime_fee } = terms(now);
      const ticketNumber = await this.tickets.create(
        {
          transaction_datetime: now,
          location: input.location,
          description: input.description,
          due_date,
          amount: input.amount,
          onetime_fee,
          employee_name: employeeName,
          status,
          client_number: input.client_number,
        },
        connection,
      );
      if (status === 'sold') {
        await this.clients.incrementSellCount(input.client_number, connection);
      }
      return this.tickets.loadByTicketNumber(ticketNumber, connection);
    });
    if (!ticket) throw new Error('The new ticket could not be reloaded.');
    return withPickupWindow(ticket, holidayDateKeys, toShopDateKey(new Date()));
  }

  private async assertClientCanIssue(
    clientNumber: number,
    connection: PoolClient,
  ) {
    const client = await this.clients.lockForTicket(clientNumber, connection);
    if (!client) throw new NotFoundException('Client not found.');
    if (!client.is_active) {
      throw new ConflictException(
        'Deactivated clients cannot issue, convert or transfer tickets. Reactivate the client first.',
      );
    }
  }

  // Tickets record the employee's nickname, or first name when it is blank.
  private async employeeName(password: string, connection: PoolClient) {
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
    return employee.nickname.trim() || employee.first_name;
  }

  private async loadHolidayDateKeys() {
    const holidays = await this.holidays.loadHolidayDates();
    return holidays.map((holiday) => holiday.holiday_date);
  }
}

// The legal hold is reported for every status, including picked-up tickets
// that were paid before the item may be released. It warns; it never blocks.
const withPickupWindow = (
  ticket: TicketRecord,
  holidayDateKeys: string[],
  today: string,
) => {
  const earliestPickupDate = getEarliestPickupDate(
    ticket.transaction_datetime,
    holidayDateKeys,
  );
  return {
    ...ticket,
    earliest_pickup_date: earliestPickupDate,
    pickup_allowed: today >= earliestPickupDate,
  };
};
