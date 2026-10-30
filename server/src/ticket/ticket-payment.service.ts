import { Injectable } from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';
import { inTransaction } from '../common/transaction.js';
import type { ExtendTicketsDto, PickupTicketsDto } from './ticket.dto.js';
import {
  getExtendedDueDatetime,
  getExtensionAmount,
  getTicketPickupAmount,
} from './ticket-finance.js';
import type { TicketRecord } from './ticket.mapper.js';
import { TicketRepository } from './ticket.repository.js';
import {
  TicketSupport,
  ticketConflict,
  ticketNotFound,
} from './ticket-support.js';

const cents = (amount: number) => Math.round(amount * 100);
const money = (amount: number) => `$${amount.toFixed(2)}`;

// Pickups and extensions: the window sends the amounts it showed, and the
// server recomputes them. Any difference rejects the whole batch, so nobody
// is charged an amount they did not see.
@Injectable()
export class TicketPaymentService {
  constructor(
    private readonly pool: Pool,
    private readonly tickets: TicketRepository,
    private readonly support: TicketSupport,
  ) {}

  async pickup(input: PickupTicketsDto) {
    const tickets = await inTransaction(this.pool, async (connection) => {
      const now = new Date();
      const locked = await this.lockPayable(
        input.tickets.map((line) => line.ticket_number),
        connection,
      );
      const payments = input.tickets.map((line) => {
        const amount = getTicketPickupAmount(
          locked.get(line.ticket_number)!,
          now,
        );
        assertShownAmount(line.ticket_number, line.amount, amount);
        return { ticket_number: line.ticket_number, amount };
      });
      const picked = await this.tickets.pickup(payments, now, connection);
      if (picked.length !== payments.length) {
        throw ticketConflict('Some selected tickets could not be picked up.');
      }
      return this.reloadAll(picked, connection);
    });
    return this.support.present(tickets);
  }

  async extend(input: ExtendTicketsDto) {
    const tickets = await inTransaction(this.pool, async (connection) => {
      const now = new Date();
      const locked = await this.lockPayable(
        input.extensions.map((line) => line.ticket_number),
        connection,
      );
      for (const line of input.extensions) {
        const ticket = locked.get(line.ticket_number)!;
        const amount = getExtensionAmount(ticket.amount, line.months);
        assertShownAmount(line.ticket_number, line.amount, amount);
        await this.tickets.extend(
          line.ticket_number,
          line.months,
          getExtendedDueDatetime(ticket.due_date, line.months),
          amount,
          now,
          connection,
        );
      }
      return this.reloadAll(
        input.extensions.map((line) => line.ticket_number),
        connection,
      );
    });
    return this.support.present(tickets);
  }

  // Locks every selected ticket (in number order) and checks it can be paid.
  private async lockPayable(ticketNumbers: number[], connection: PoolClient) {
    const locked = new Map(
      (await this.tickets.loadManyForUpdate(ticketNumbers, connection)).map(
        (ticket) => [ticket.ticket_number, ticket],
      ),
    );
    for (const ticketNumber of ticketNumbers) {
      const ticket = locked.get(ticketNumber);
      if (!ticket) throw ticketNotFound(ticketNumber);
      if (ticket.status !== 'pawned') {
        throw ticketConflict(`Ticket #${ticketNumber} is not pawned.`);
      }
      if (ticket.is_stolen) {
        throw ticketConflict(`Ticket #${ticketNumber} is marked stolen.`);
      }
    }
    return locked;
  }

  private async reloadAll(ticketNumbers: number[], connection: PoolClient) {
    const tickets: TicketRecord[] = [];
    for (const ticketNumber of [...ticketNumbers].sort((a, b) => a - b)) {
      tickets.push(await this.support.reload(ticketNumber, connection));
    }
    return tickets;
  }
}

const assertShownAmount = (
  ticketNumber: number,
  shown: number,
  actual: number,
) => {
  if (cents(shown) === cents(actual)) return;
  throw ticketConflict(
    `Ticket #${ticketNumber} amount is now ${money(actual)} (the screen showed ${money(shown)}). Please review.`,
  );
};
