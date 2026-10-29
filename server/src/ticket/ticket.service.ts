import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientRepository } from '../client/client.repository.js';
import { HolidayRepository } from '../reference/holidays/holiday.repository.js';
import { getEarliestPickupDate, toShopDateKey } from './ticket-finance.js';
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
    private readonly tickets: TicketRepository,
    private readonly clients: ClientRepository,
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
