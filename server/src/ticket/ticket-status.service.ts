import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { ClientRepository } from '../client/client.repository.js';
import { inTransaction } from '../common/transaction.js';
import type { ReverseTicketDto, SetStolenDto } from './ticket.dto.js';
import { isBeforeShopDate } from './ticket-finance.js';
import { TicketRepository } from './ticket.repository.js';
import { TicketSupport, ticketConflict } from './ticket-support.js';

// Status changes outside payment: expire, stolen flag and reversal.
@Injectable()
export class TicketStatusService {
  constructor(
    private readonly pool: Pool,
    private readonly tickets: TicketRepository,
    private readonly clients: ClientRepository,
    private readonly support: TicketSupport,
  ) {}

  // Routine and only possible after the due date, so no PIN is needed.
  async expire(ticketNumber: number) {
    const ticket = await inTransaction(this.pool, async (connection) => {
      const existing = await this.support.requireTicketForUpdate(
        ticketNumber,
        connection,
      );
      if (existing.status !== 'pawned' && existing.status !== 'sold') {
        throw ticketConflict('Only pawned or sold tickets can be expired.');
      }
      const now = new Date();
      if (!isBeforeShopDate(existing.due_date, now)) {
        throw ticketConflict('Only tickets past the due date can be expired.');
      }
      await this.tickets.expire(
        ticketNumber,
        existing.status === 'sold' ? 'sold_expired' : 'pawned_expired',
        now,
        connection,
      );
      await this.clients.adjustCount(
        existing.client_number,
        'expire_count',
        1,
        connection,
      );
      return this.support.reload(ticketNumber, connection);
    });
    const [presented] = await this.support.present([ticket]);
    return presented;
  }

  // Marking is signed in the client's notes; unmarking needs no PIN or note.
  async setStolen(ticketNumber: number, input: SetStolenDto) {
    const ticket = await inTransaction(this.pool, async (connection) => {
      const existing = await this.support.requireTicketForUpdate(
        ticketNumber,
        connection,
      );
      if (!input.is_stolen) {
        if (!existing.is_stolen) {
          throw ticketConflict('This ticket is not marked stolen.');
        }
      } else {
        if (existing.status !== 'pawned' && existing.status !== 'sold') {
          throw ticketConflict(
            'Only pawned or sold tickets can be marked stolen.',
          );
        }
        if (existing.is_stolen) {
          throw ticketConflict('This ticket is already marked stolen.');
        }
        const employee = await this.support.requireEmployee(
          input.employee_password!,
          connection,
        );
        await this.support.signClientNote(
          existing.client_number,
          `Ticket #${ticketNumber} marked STOLEN`,
          employee.first_name,
          new Date(),
          connection,
        );
      }
      await this.tickets.setStolen(ticketNumber, input.is_stolen, connection);
      return this.support.reload(ticketNumber, connection);
    });
    const [presented] = await this.support.present([ticket]);
    return presented;
  }

  // Reopens an expired or picked-up pawn. It undoes a cash pickup, so it is
  // signed in the client's notes and the matching client counter is reduced.
  async reverse(ticketNumber: number, input: ReverseTicketDto) {
    const result = await inTransaction(this.pool, async (connection) => {
      const existing = await this.support.requireTicketForUpdate(
        ticketNumber,
        connection,
      );
      const previousStatus = existing.status;
      if (
        previousStatus !== 'pawned_expired' &&
        previousStatus !== 'pawned_picked_up'
      ) {
        throw ticketConflict(
          'Only expired or picked-up pawn tickets can be reversed.',
        );
      }
      const conflict = await this.tickets.findConflictingLinkedTicket(
        ticketNumber,
        connection,
      );
      if (conflict) {
        throw ticketConflict(
          `Item #${conflict.item_number} is linked to a newer or active ticket #${conflict.ticket_number}.`,
        );
      }
      const employee = await this.support.requireEmployee(
        input.employee_password,
        connection,
      );
      const now = new Date();
      await this.tickets.reverse(
        {
          ticket_number: ticketNumber,
          status: previousStatus,
          pickup_datetime: existing.pickup_datetime,
          pickup_amount_paid: existing.pickup_amount_paid,
          expire_date: existing.expire_date,
        },
        now,
        connection,
      );
      const pickedUp = previousStatus === 'pawned_picked_up';
      await this.clients.adjustCount(
        existing.client_number,
        pickedUp ? 'redeem_count' : 'expire_count',
        -1,
        connection,
      );
      await this.support.signClientNote(
        existing.client_number,
        `Ticket #${ticketNumber} ${pickedUp ? 'pickup' : 'expiry'} reversed`,
        employee.first_name,
        now,
        connection,
      );
      const ticket = await this.support.reload(ticketNumber, connection);
      const client = await this.clients.loadByNumber(
        existing.client_number,
        connection,
      );
      return { ticket, client, previous_status: previousStatus };
    });
    const [ticket] = await this.support.present([result.ticket]);
    return { ...result, ticket };
  }
}
