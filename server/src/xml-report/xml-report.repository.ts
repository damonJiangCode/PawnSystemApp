import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import {
  shopDateSql,
  shopDayStart,
  shopTimeSql,
} from '../common/shop-time.sql.js';
import type { LeadsOnlineEnvironment } from './xml-report.types.js';

// One row per ticket item (a ticket without items has one row with null item
// columns). Dates are already text in the shop's time zone.
export type XmlReportSourceRow = {
  ticket_number: number;
  ticket_datetime: string; // YYYY-MM-DD HH24:MI
  redeem_by_date: string; // YYYY-MM-DD
  ticket_amount: number;
  ticket_status: string;
  employee_name: string;
  client_number: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  date_of_birth: string;
  gender: string;
  hair_color: string;
  eye_color: string;
  height_cm: number;
  weight_kg: number;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  phone: string;
  email: string;
  id_type: string;
  id_value: string;
  item_number: number | null;
  quantity: number;
  category_name: string;
  description: string;
  brand_name: string;
  model_number: string;
  serial_number: string;
  item_amount: number;
};

export type SubmissionStatus = 'submitted' | 'failed';

export type SubmissionRecord = { status: SubmissionStatus; message: string };

export type SubmissionResultInput = {
  ticket_number: number;
  ticket_type: 'Pawn' | 'Buy';
  ticket_datetime: string;
  environment: LeadsOnlineEnvironment;
  status: SubmissionStatus;
  error_code: number;
  message: string;
};

const text = (value: unknown) => (value == null ? '' : String(value));

// Any fixed number works; it only has to be the same for every submit.
const SUBMIT_LOCK_KEY = 4_200_001;

@Injectable()
export class XmlReportRepository {
  constructor(private readonly pool: Pool) {}

  // Runs `work` while holding a PostgreSQL advisory lock, so two submits
  // (a double click, or two computers) never send the same tickets at once.
  // Returns null without running `work` if another submit holds the lock.
  // The lock belongs to this connection, and PostgreSQL drops it if the
  // connection dies, so a crash cannot leave it stuck.
  async withSubmitLock<T>(work: () => Promise<T>): Promise<T | null> {
    const connection = await this.pool.connect();
    try {
      const { rows } = await connection.query(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [SUBMIT_LOCK_KEY],
      );
      if (!rows[0]?.locked) return null;
      try {
        return await work();
      } finally {
        await connection.query('SELECT pg_advisory_unlock($1)', [
          SUBMIT_LOCK_KEY,
        ]);
      }
    } finally {
      connection.release();
    }
  }

  // Tickets written between the two shop days, with client, first ID and items.
  async loadSourceRows(
    fromDate: string,
    toDate: string,
  ): Promise<XmlReportSourceRow[]> {
    const { rows } = await this.pool.query(
      `SELECT
         t.ticket_number,
         ${shopTimeSql('t.transaction_datetime', 'YYYY-MM-DD HH24:MI')} AS ticket_datetime,
         ${shopDateSql('t.due_date')} AS redeem_by_date,
         t.amount AS ticket_amount,
         t.status AS ticket_status,
         t.employee_name,
         c.client_number,
         c.first_name,
         c.last_name,
         c.middle_name,
         TO_CHAR(c.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
         c.gender,
         c.hair_color,
         c.eye_color,
         c.height_cm,
         c.weight_kg,
         c.address,
         c.city,
         c.province,
         c.postal_code,
         c.phone,
         c.email,
         first_id.id_type,
         first_id.id_value,
         i.item_number,
         i.quantity,
         ic.name AS category_name,
         i.description,
         i.brand_name,
         i.model_number,
         i.serial_number,
         i.amount AS item_amount
       FROM ticket t
       INNER JOIN client c ON c.client_number = t.client_number
       LEFT JOIN LATERAL (
         SELECT ci.id_type, ci.id_value
         FROM client_id ci
         WHERE ci.client_number = c.client_number
         ORDER BY ci.id
         LIMIT 1
       ) first_id ON TRUE
       LEFT JOIN ticket_item ti ON ti.ticket_number = t.ticket_number
       LEFT JOIN item i ON i.item_number = ti.item_number
       LEFT JOIN item_subcategory isc ON isc.id = i.subcategory_id
       LEFT JOIN item_category ic ON ic.id = isc.category_id
       WHERE t.transaction_datetime >= ${shopDayStart('$1::date')}
         AND t.transaction_datetime < ${shopDayStart('($2::date + 1)')}
       ORDER BY t.transaction_datetime, t.ticket_number, i.item_number`,
      [fromDate, toDate],
    );

    // pg returns NUMERIC as strings.
    return rows.map((row: Record<string, unknown>) => ({
      ticket_number: Number(row.ticket_number),
      ticket_datetime: text(row.ticket_datetime),
      redeem_by_date: text(row.redeem_by_date),
      ticket_amount: Number(row.ticket_amount ?? 0),
      ticket_status: text(row.ticket_status),
      employee_name: text(row.employee_name),
      client_number: Number(row.client_number),
      first_name: text(row.first_name),
      last_name: text(row.last_name),
      middle_name: text(row.middle_name),
      date_of_birth: text(row.date_of_birth),
      gender: text(row.gender),
      hair_color: text(row.hair_color),
      eye_color: text(row.eye_color),
      height_cm: Number(row.height_cm ?? 0),
      weight_kg: Number(row.weight_kg ?? 0),
      address: text(row.address),
      city: text(row.city),
      province: text(row.province),
      postal_code: text(row.postal_code),
      phone: text(row.phone),
      email: text(row.email),
      id_type: text(row.id_type),
      id_value: text(row.id_value),
      item_number: row.item_number == null ? null : Number(row.item_number),
      quantity: Number(row.quantity ?? 1),
      category_name: text(row.category_name),
      description: text(row.description),
      brand_name: text(row.brand_name),
      model_number: text(row.model_number),
      serial_number: text(row.serial_number),
      item_amount: Number(row.item_amount ?? 0),
    }));
  }

  // The last submission result of each ticket in this environment.
  async loadSubmissions(
    ticketNumbers: number[],
    environment: LeadsOnlineEnvironment,
  ): Promise<Map<number, SubmissionRecord>> {
    if (!ticketNumbers.length) return new Map();

    const { rows } = await this.pool.query(
      `SELECT ticket_number, status, message
       FROM xml_report_submission
       WHERE environment = $1
         AND ticket_number = ANY($2::int[])`,
      [environment, ticketNumbers],
    );
    return new Map(
      rows.map((row: Record<string, unknown>) => [
        Number(row.ticket_number),
        {
          status: row.status as SubmissionStatus,
          message: text(row.message),
        },
      ]),
    );
  }

  // Record one attempt. A retry updates the same row and counts the attempt.
  async saveSubmissionResult(input: SubmissionResultInput): Promise<void> {
    await this.pool.query(
      `INSERT INTO xml_report_submission (
         ticket_number, ticket_type, ticket_datetime, environment,
         status, error_code, message, submitted_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         CASE WHEN $5 = 'submitted' THEN CURRENT_TIMESTAMP END
       )
       ON CONFLICT (ticket_number, ticket_type, ticket_datetime, environment)
       DO UPDATE SET
         status = EXCLUDED.status,
         attempt_count = xml_report_submission.attempt_count + 1,
         error_code = EXCLUDED.error_code,
         message = EXCLUDED.message,
         submitted_at = COALESCE(EXCLUDED.submitted_at, xml_report_submission.submitted_at),
         last_attempt_at = CURRENT_TIMESTAMP`,
      [
        input.ticket_number,
        input.ticket_type,
        input.ticket_datetime,
        input.environment,
        input.status,
        input.error_code,
        input.message,
      ],
    );
  }
}
