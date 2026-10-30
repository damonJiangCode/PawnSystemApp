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

export type TicketEdit = {
  is_lost: boolean;
  location: string;
  description: string;
  amount: number;
  onetime_fee: number;
  employee_name: string;
};

export type TicketConversion = {
  status: 'pawned' | 'sold';
  location: string;
  description: string;
  amount: number;
  onetime_fee: number;
  due_date: Date;
  employee_name: string;
  converted_at: Date;
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

  // FOR UPDATE OF t: Postgres refuses FOR UPDATE on the aggregate subquery,
  // and only the ticket rows need the lock.
  async loadForUpdate(ticketNumber: number, connection: PoolClient) {
    const [ticket] = await this.loadManyForUpdate([ticketNumber], connection);
    return ticket ?? null;
  }

  // Ordered by number so two batches lock overlapping tickets in the same order.
  async loadManyForUpdate(ticketNumbers: number[], connection: PoolClient) {
    const result = await connection.query(
      `${ticketSelect}
       WHERE t.ticket_number = ANY($1::int[])
       ORDER BY t.ticket_number
       FOR UPDATE OF t`,
      [ticketNumbers],
    );
    return result.rows.map(mapTicketRow);
  }

  async loadTransferPreview(ticketNumber: number) {
    const result = await this.pool.query<{
      ticket_number: number;
      status: TicketStatus;
      description: string | null;
      location: string;
      amount: string;
      previous_client_number: number;
      previous_client_name: string;
      previous_client_is_active: boolean;
    }>(
      `SELECT t.ticket_number, t.status, t.description, t.location, t.amount,
         t.client_number AS previous_client_number,
         CONCAT(UPPER(c.last_name), ', ', UPPER(c.first_name),
           CASE WHEN COALESCE(TRIM(c.middle_name), '') = '' THEN ''
                ELSE CONCAT(' ', UPPER(c.middle_name)) END) AS previous_client_name,
         c.is_active AS previous_client_is_active
       FROM ticket t
       INNER JOIN client c ON c.client_number = t.client_number
       WHERE t.ticket_number = $1`,
      [ticketNumber],
    );
    const row = result.rows[0];
    return row
      ? {
          ticket_number: Number(row.ticket_number),
          status: row.status,
          description: row.description ?? '',
          location: row.location,
          amount: Number(row.amount),
          previous_client_number: Number(row.previous_client_number),
          previous_client_name: row.previous_client_name,
          previous_client_is_active: row.previous_client_is_active,
        }
      : null;
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

  async update(ticketNumber: number, edit: TicketEdit, connection: PoolClient) {
    await connection.query(
      `UPDATE ticket SET is_lost = $2, location = $3, description = $4,
         amount = $5, onetime_fee = $6, employee_name = $7
       WHERE ticket_number = $1`,
      [
        ticketNumber,
        edit.is_lost,
        edit.location,
        edit.description,
        edit.amount,
        edit.onetime_fee,
        edit.employee_name,
      ],
    );
  }

  // The transaction date is kept: converting corrects a pawn/sell choice.
  async convert(
    ticketNumber: number,
    change: TicketConversion,
    connection: PoolClient,
  ) {
    await connection.query(
      `UPDATE ticket SET status = $2, location = $3, description = $4,
         amount = $5, onetime_fee = $6, due_date = $7, employee_name = $8,
         status_updated_at = $9
       WHERE ticket_number = $1`,
      [
        ticketNumber,
        change.status,
        change.location,
        change.description,
        change.amount,
        change.onetime_fee,
        change.due_date,
        change.employee_name,
        change.converted_at,
      ],
    );
  }

  async transfer(
    ticketNumber: number,
    clientNumber: number,
    connection: PoolClient,
  ) {
    await connection.query(
      'UPDATE ticket SET client_number = $2 WHERE ticket_number = $1',
      [ticketNumber, clientNumber],
    );
  }

  // Marks the tickets picked up and adds them to each owner's redeem count.
  async pickup(
    payments: { ticket_number: number; amount: number }[],
    pickedUpAt: Date,
    connection: PoolClient,
  ) {
    const result = await connection.query<{ ticket_number: number }>(
      `WITH picked AS (
         UPDATE ticket
         SET status = 'pawned_picked_up', pickup_datetime = $1,
             pickup_amount_paid = input.amount, status_updated_at = $1
         FROM UNNEST($2::int[], $3::numeric[]) AS input(ticket_number, amount)
         WHERE ticket.ticket_number = input.ticket_number
           AND ticket.status = 'pawned'
         RETURNING ticket.ticket_number, ticket.client_number
       ),
       counts AS (
         SELECT client_number, COUNT(*)::int AS picked_count
         FROM picked GROUP BY client_number
       ),
       redeemed AS (
         UPDATE client
         SET redeem_count = COALESCE(redeem_count, 0) + counts.picked_count,
             updated_at = CURRENT_TIMESTAMP
         FROM counts
         WHERE client.client_number = counts.client_number
       )
       SELECT ticket_number FROM picked`,
      [
        pickedUpAt,
        payments.map((payment) => payment.ticket_number),
        payments.map((payment) => payment.amount),
      ],
    );
    return result.rows.map((row) => Number(row.ticket_number));
  }

  async extend(
    ticketNumber: number,
    months: number,
    dueDate: Date,
    amountPaid: number,
    paidAt: Date,
    connection: PoolClient,
  ) {
    await connection.query(
      `UPDATE ticket SET due_date = $2,
         interest_paid_months = interest_paid_months + $3,
         interested_datetime = $4
       WHERE ticket_number = $1`,
      [ticketNumber, dueDate, months, paidAt],
    );
    await connection.query(
      `INSERT INTO interest_payment (ticket_number, months_paid, amount_paid,
         payment_datetime)
       VALUES ($1, $2, $3, $4)`,
      [ticketNumber, months, amountPaid, paidAt],
    );
  }

  async expire(
    ticketNumber: number,
    status: 'pawned_expired' | 'sold_expired',
    expiredAt: Date,
    connection: PoolClient,
  ) {
    await connection.query(
      `UPDATE ticket SET status = $2, expire_date = $3, status_updated_at = $3
       WHERE ticket_number = $1`,
      [ticketNumber, status, expiredAt],
    );
  }

  async setStolen(
    ticketNumber: number,
    isStolen: boolean,
    connection: PoolClient,
  ) {
    await connection.query(
      'UPDATE ticket SET is_stolen = $2 WHERE ticket_number = $1',
      [ticketNumber, isStolen],
    );
  }

  // An item may not return to this ticket while a newer or open ticket holds it.
  async findConflictingLinkedTicket(
    ticketNumber: number,
    connection: PoolClient,
  ) {
    const result = await connection.query<{
      item_number: number;
      ticket_number: number;
    }>(
      `SELECT current_items.item_number, later_ticket.ticket_number
       FROM ticket_item current_items
       INNER JOIN ticket current_ticket
         ON current_ticket.ticket_number = current_items.ticket_number
       INNER JOIN ticket_item later_items
         ON later_items.item_number = current_items.item_number
        AND later_items.ticket_number <> current_items.ticket_number
       INNER JOIN ticket later_ticket
         ON later_ticket.ticket_number = later_items.ticket_number
       WHERE current_items.ticket_number = $1
         AND (
           later_ticket.status IN ('pawned', 'sold')
           OR later_ticket.transaction_datetime > current_ticket.transaction_datetime
           OR (
             later_ticket.transaction_datetime = current_ticket.transaction_datetime
             AND later_ticket.ticket_number > current_ticket.ticket_number
           )
         )
       ORDER BY later_ticket.transaction_datetime DESC,
                later_ticket.ticket_number DESC
       LIMIT 1`,
      [ticketNumber],
    );
    const row = result.rows[0];
    return row
      ? {
          item_number: Number(row.item_number),
          ticket_number: Number(row.ticket_number),
        }
      : null;
  }

  // Keeps the undone pickup/expiry in ticket_reversal, then reopens the pawn.
  async reverse(
    ticket: {
      ticket_number: number;
      status: 'pawned_expired' | 'pawned_picked_up';
      pickup_datetime: Date | null;
      pickup_amount_paid: number | null;
      expire_date: Date | null;
    },
    reversedAt: Date,
    connection: PoolClient,
  ) {
    await connection.query(
      `INSERT INTO ticket_reversal (ticket_number, previous_status,
         previous_pickup_datetime, previous_pickup_amount_paid,
         previous_expire_date, reversed_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        ticket.ticket_number,
        ticket.status,
        ticket.pickup_datetime,
        ticket.pickup_amount_paid,
        ticket.expire_date,
        reversedAt,
      ],
    );
    await connection.query(
      `UPDATE ticket SET status = 'pawned', pickup_datetime = NULL,
         pickup_amount_paid = NULL, expire_date = NULL, status_updated_at = $2
       WHERE ticket_number = $1`,
      [ticket.ticket_number, reversedAt],
    );
  }
}
