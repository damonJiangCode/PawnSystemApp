import { Injectable } from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';
import {
  mapTicketRow,
  ticketSelect,
  type TicketStatus,
} from './ticket.mapper.js';

export type NewTicket = {
  transaction_datetime: Date;
  location: string;
  description: string;
  due_date: Date;
  amount: number;
  onetime_fee: number;
  employee_name: string;
  status: TicketStatus;
  client_number: number;
};

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

  async loadByTicketNumber(
    ticketNumber: number,
    connection: Pool | PoolClient = this.pool,
  ) {
    const result = await connection.query(
      `${ticketSelect}
       WHERE t.ticket_number = $1`,
      [ticketNumber],
    );
    return result.rows[0] ? mapTicketRow(result.rows[0]) : null;
  }

  // FOR SHARE keeps the location from being deactivated before COMMIT.
  async isLocationActive(location: string, connection: PoolClient) {
    const result = await connection.query<{ is_active: boolean }>(
      'SELECT is_active FROM location WHERE location = $1 FOR SHARE',
      [location],
    );
    return result.rows[0]?.is_active === true;
  }

  async create(ticket: NewTicket, connection: PoolClient) {
    const result = await connection.query<{ ticket_number: number }>(
      `INSERT INTO ticket (transaction_datetime, is_lost, location, description,
         due_date, amount, onetime_fee, employee_name, status, client_number)
       VALUES ($1, FALSE, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ticket_number`,
      [
        ticket.transaction_datetime,
        ticket.location,
        ticket.description,
        ticket.due_date,
        ticket.amount,
        ticket.onetime_fee,
        ticket.employee_name,
        ticket.status,
        ticket.client_number,
      ],
    );
    return result.rows[0].ticket_number;
  }
}
