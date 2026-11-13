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

export type InterestReportRow = {
  ticket_number: number;
  months_paid: number;
  amount_paid: number;
  payment_datetime: Date;
  description: string;
  client_name: string;
};

export type OverdueReportRow = {
  ticket_number: number;
  client_name: string;
  location: string;
  transaction_date: string;
  due_date: string;
  interest_paid_months: number;
  item_number: number | null;
  item_description: string;
  brand_name: string;
  model_number: string;
  serial_number: string;
};

// Overdue location choices:
// - shelf: letters+number codes from..to, ordered by (letters, number): AB11..AC43
// - lettered: letters-dash-letters codes, ordered by (prefix, suffix): RR-A..RR-Z
// - single: one location such as AK
export type OverdueLocationFilter =
  | { kind: 'shelf'; from: [string, number]; to: [string, number] }
  | { kind: 'lettered'; from: [string, string]; to: [string, string] }
  | { kind: 'single'; location: string };

// Location codes as (first, second) sort keys; NULL when the code has another shape.
// COLLATE "C" compares letters by code point, the same way JavaScript does.
const shelfKeySql = `
  SUBSTRING(t.location FROM '^([A-Z]+)[0-9]+$') COLLATE "C",
  CAST(SUBSTRING(t.location FROM '^[A-Z]+([0-9]+)$') AS INTEGER)`;
const letteredKeySql = `
  SUBSTRING(t.location FROM '^([A-Z]+)-[A-Z]+$') COLLATE "C",
  SUBSTRING(t.location FROM '^[A-Z]+-([A-Z]+)$') COLLATE "C"`;

// The WHERE condition, its values ($2...), and the location sort order.
const overdueLocationSql = (
  filter: OverdueLocationFilter,
): [string, unknown[], string] => {
  if (filter.kind === 'single') {
    return ['t.location = $2', [filter.location], 't.location'];
  }
  const [key, cast] =
    filter.kind === 'shelf' ? [shelfKeySql, 'int'] : [letteredKeySql, 'text'];
  return [
    `(${key}) >= ($2::text, $3::${cast}) AND (${key}) <= ($4::text, $5::${cast})`,
    [...filter.from, ...filter.to],
    key,
  ];
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

// YYYY-MM-DD day in the shop's time zone.
const shopDateSql = (column: string) =>
  `TO_CHAR(${column} AT TIME ZONE '${SHOP_TIME_ZONE}', 'YYYY-MM-DD')`;

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

  // Interest (extension) payments made between the two shop days.
  async loadInterestRows(
    fromDate: string,
    toDate: string,
  ): Promise<InterestReportRow[]> {
    const { rows } = await this.pool.query(
      `SELECT
         ip.ticket_number,
         ip.months_paid,
         ip.amount_paid,
         ip.payment_datetime,
         t.description,
         ${clientNameSql('c')} AS client_name
       FROM interest_payment ip
       INNER JOIN ticket t ON t.ticket_number = ip.ticket_number
       LEFT JOIN client c ON c.client_number = t.client_number
       WHERE ip.payment_datetime >= ${shopDayStart('$1::date')}
         AND ip.payment_datetime < ${shopDayStart('($2::date + 1)')}
       ORDER BY ip.payment_datetime, ip.ticket_number`,
      [fromDate, toDate],
    );

    return rows.map((row: Record<string, unknown>) => ({
      ticket_number: Number(row.ticket_number),
      months_paid: Number(row.months_paid ?? 0),
      amount_paid: Number(row.amount_paid ?? 0),
      payment_datetime: row.payment_datetime as Date,
      description: text(row.description),
      client_name: text(row.client_name),
    }));
  }

  // The shop day of the first recorded interest payment, or null if none yet.
  async loadInterestRecordsStartDate(): Promise<string | null> {
    const { rows } = await this.pool.query(
      `SELECT TO_CHAR(MIN(payment_datetime) AT TIME ZONE '${SHOP_TIME_ZONE}', 'YYYY-MM-DD')
                AS start_date
       FROM interest_payment`,
    );
    return (rows[0]?.start_date as string | null) ?? null;
  }

  // Pawned tickets due on or before the day in the chosen locations,
  // skipping clients on hold. One row per item, in shelf order.
  async loadOverdueRows(
    dueOnOrBefore: string,
    filter: OverdueLocationFilter,
  ): Promise<OverdueReportRow[]> {
    const [locationSql, locationValues, locationOrderSql] =
      overdueLocationSql(filter);
    const { rows } = await this.pool.query(
      `SELECT
         t.ticket_number,
         ${clientNameSql('c')} AS client_name,
         t.location,
         ${shopDateSql('t.transaction_datetime')} AS transaction_date,
         ${shopDateSql('t.due_date')} AS due_date,
         t.interest_paid_months,
         i.item_number,
         i.description AS item_description,
         i.brand_name,
         i.model_number,
         i.serial_number
       FROM ticket t
       INNER JOIN client c ON c.client_number = t.client_number
       LEFT JOIN ticket_item ti ON ti.ticket_number = t.ticket_number
       LEFT JOIN item i ON i.item_number = ti.item_number
       WHERE t.status = 'pawned'
         AND (c.hold_until IS NULL OR c.hold_until < $1::date)
         AND t.due_date < ${shopDayStart('($1::date + 1)')}
         AND ${locationSql}
       ORDER BY
         ${locationOrderSql},
         t.due_date,
         t.ticket_number,
         i.item_number`,
      [dueOnOrBefore, ...locationValues],
    );

    return rows.map((row: Record<string, unknown>) => ({
      ticket_number: Number(row.ticket_number),
      client_name: text(row.client_name),
      location: text(row.location),
      transaction_date: text(row.transaction_date),
      due_date: text(row.due_date),
      interest_paid_months: Number(row.interest_paid_months ?? 0),
      item_number: row.item_number == null ? null : Number(row.item_number),
      item_description: text(row.item_description),
      brand_name: text(row.brand_name),
      model_number: text(row.model_number),
      serial_number: text(row.serial_number),
    }));
  }

  // The given location codes that exist in the location table.
  async loadExistingLocations(locations: string[]): Promise<string[]> {
    const { rows } = await this.pool.query(
      'SELECT location FROM location WHERE location = ANY($1::text[])',
      [locations],
    );
    return rows.map((row: Record<string, unknown>) => String(row.location));
  }
}
