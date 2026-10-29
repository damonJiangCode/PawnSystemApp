import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { mapTicketRow, ticketSelect } from './ticket.mapper.js';

@Injectable()
export class TicketRepository {
  constructor(private readonly pool: Pool) {}

  async loadByClientNumber(clientNumber: number) {
    const result = await this.pool.query(
      `${ticketSelect}
       WHERE t.client_number = $1
       ORDER BY t.transaction_datetime ASC, t.ticket_number ASC`,
      [clientNumber],
    );
    return result.rows.map(mapTicketRow);
  }

  async loadByTicketNumber(ticketNumber: number) {
    const result = await this.pool.query(
      `${ticketSelect}
       WHERE t.ticket_number = $1`,
      [ticketNumber],
    );
    return result.rows[0] ? mapTicketRow(result.rows[0]) : null;
  }
}
