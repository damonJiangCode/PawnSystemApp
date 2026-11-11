import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { SHOP_TIME_ZONE } from '../ticket/ticket-finance.js';

export type DailyReportRow = {
  ticket_number: number;
  ticket_amount: number;
  ticket_description: string;
  client_name: string;
  gender: string;
  eye_color: string;
  identifications: string;
  item_number: number | null;
  quantity: number;
  item_description: string;
  brand_name: string;
  model_number: string;
  serial_number: string;
  item_amount: number;
};

export type BuybackReportRow = {
  ticket_number: number;
  pickup_datetime: Date;
  pickup_amount_paid: number;
  description: string;
  client_name: string;
};

const clientNameSql = (alias: string) => `
  CONCAT(
    UPPER(${alias}.last_name), ', ', UPPER(${alias}.first_name),
    CASE WHEN COALESCE(TRIM(${alias}.middle_name), '') = '' THEN ''
         ELSE CONCAT(' ', UPPER(${alias}.middle_name)) END
  )`;

// The database runs in UTC, so a report day must start at midnight in the
// shop's time zone, not at midnight UTC (6 PM in Regina).
const shopDayStart = (param: string) =>
  `(${param}::timestamp AT TIME ZONE '${SHOP_TIME_ZONE}')`;

const text = (value: unknown) => (value ? String(value) : '');

@Injectable()
export class ReportRepository {
  constructor(private readonly pool: Pool) {}

  // One row per ticket item; a ticket without items has one row with null item columns.
  async loadDailyRows(
    fromDate: string,
    toDate: string,
  ): Promise<DailyReportRow[]> {
    const { rows } = await this.pool.query(
      `SELECT
         t.ticket_number,
         t.amount AS ticket_amount,
         t.description AS ticket_description,
         ${clientNameSql('c')} AS client_name,
         c.gender,
         c.eye_color,
         ids.identifications,
         i.item_number,
         i.quantity,
         i.description AS item_description,
         i.brand_name,
         i.model_number,
         i.serial_number,
         i.amount AS item_amount
       FROM ticket t
       LEFT JOIN client c ON c.client_number = t.client_number
       LEFT JOIN LATERAL (
         SELECT STRING_AGG(CONCAT(ci.id_type, ': ', ci.id_value), ' | ' ORDER BY ci.id)
                  AS identifications
         FROM client_id ci
         WHERE ci.client_number = c.client_number
       ) ids ON TRUE
       LEFT JOIN ticket_item ti ON ti.ticket_number = t.ticket_number
       LEFT JOIN item i ON i.item_number = ti.item_number
       WHERE t.transaction_datetime >= ${shopDayStart('$1::date')}
         AND t.transaction_datetime < ${shopDayStart('($2::date + 1)')}
       ORDER BY t.transaction_datetime, t.ticket_number, i.item_number`,
      [fromDate, toDate],
    );

    // pg returns NUMERIC as strings.
    return rows.map((row: Record<string, unknown>) => ({
      ticket_number: Number(row.ticket_number),
      ticket_amount: Number(row.ticket_amount ?? 0),
      ticket_description: text(row.ticket_description),
      client_name: text(row.client_name),
      gender: text(row.gender),
      eye_color: text(row.eye_color),
      identifications: text(row.identifications),
      item_number: row.item_number == null ? null : Number(row.item_number),
      quantity: Number(row.quantity ?? 0),
      item_description: text(row.item_description),
      brand_name: text(row.brand_name),
      model_number: text(row.model_number),
      serial_number: text(row.serial_number),
      item_amount: Number(row.item_amount ?? 0),
    }));
  }

  // Tickets picked up (bought back) between the two shop days.
  async loadBuybackRows(
    fromDate: string,
    toDate: string,
  ): Promise<BuybackReportRow[]> {
    const { rows } = await this.pool.query(
      `SELECT
         t.ticket_number,
         t.pickup_datetime,
         t.pickup_amount_paid,
         t.description,
         ${clientNameSql('c')} AS client_name
       FROM ticket t
       LEFT JOIN client c ON c.client_number = t.client_number
       WHERE t.status = 'pawned_picked_up'
         AND t.pickup_datetime >= ${shopDayStart('$1::date')}
         AND t.pickup_datetime < ${shopDayStart('($2::date + 1)')}
       ORDER BY t.pickup_datetime, t.ticket_number`,
      [fromDate, toDate],
    );

    return rows.map((row: Record<string, unknown>) => ({
      ticket_number: Number(row.ticket_number),
      pickup_datetime: row.pickup_datetime as Date,
      pickup_amount_paid: Number(row.pickup_amount_paid ?? 0),
      description: text(row.description),
      client_name: text(row.client_name),
    }));
  }
}
