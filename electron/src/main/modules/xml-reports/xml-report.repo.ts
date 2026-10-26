import { connect } from "../../../../../database/connection.ts";
import type {
  XmlReportEnvironment,
  XmlReportSourceRow,
} from "./xml-report.types.ts";

export type XmlReportSubmissionRecord = {
  ticket_number: number;
  status: "submitted" | "failed";
  message: string;
};

const text = (value: unknown) => (value == null ? "" : String(value));
const number = (value: unknown) => Number(value ?? 0);

const mapRow = (row: Record<string, unknown>): XmlReportSourceRow => ({
  ticket_number: number(row.ticket_number),
  transaction_datetime: new Date(text(row.transaction_datetime)),
  due_date: new Date(text(row.due_date)),
  ticket_amount: number(row.ticket_amount),
  ticket_status: text(row.ticket_status),
  employee_name: text(row.employee_name),
  client_number: number(row.client_number),
  first_name: text(row.first_name),
  last_name: text(row.last_name),
  middle_name: text(row.middle_name),
  date_of_birth: text(row.date_of_birth),
  gender: text(row.gender),
  hair_color: text(row.hair_color),
  eye_color: text(row.eye_color),
  height_cm: number(row.height_cm),
  weight_kg: number(row.weight_kg),
  address: text(row.address),
  city: text(row.city),
  province: text(row.province),
  postal_code: text(row.postal_code),
  phone: text(row.phone),
  email: text(row.email),
  id_type: text(row.id_type),
  id_value: text(row.id_value),
  item_number: row.item_number == null ? undefined : number(row.item_number),
  quantity: row.quantity == null ? undefined : number(row.quantity),
  category_name: text(row.category_name),
  description: text(row.description),
  brand_name: text(row.brand_name),
  model_number: text(row.model_number),
  serial_number: text(row.serial_number),
  item_amount: row.item_amount == null ? undefined : number(row.item_amount),
});

export const xmlReportRepo = {
  loadSourceRows: async (fromDate: string, toDate: string) => {
    const client = await connect();

    try {
      const result = await client.query(
        `
          SELECT
            t.ticket_number,
            t.transaction_datetime,
            t.due_date,
            t.amount AS ticket_amount,
            t.status AS ticket_status,
            t.employee_name,
            c.client_number,
            c.first_name,
            c.last_name,
            COALESCE(c.middle_name, '') AS middle_name,
            TO_CHAR(c.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
            c.gender,
            c.hair_color,
            c.eye_color,
            c.height_cm,
            c.weight_kg,
            COALESCE(c.address, '') AS address,
            COALESCE(c.city, '') AS city,
            COALESCE(c.province, '') AS province,
            COALESCE(c.postal_code, '') AS postal_code,
            COALESCE(c.phone, '') AS phone,
            COALESCE(c.email, '') AS email,
            COALESCE(primary_id.id_type, '') AS id_type,
            COALESCE(primary_id.id_value, '') AS id_value,
            i.item_number,
            i.quantity,
            COALESCE(ic.name, '') AS category_name,
            COALESCE(i.description, '') AS description,
            COALESCE(i.brand_name, '') AS brand_name,
            COALESCE(i.model_number, '') AS model_number,
            COALESCE(i.serial_number, '') AS serial_number,
            i.amount AS item_amount
          FROM ticket t
          INNER JOIN client c ON c.client_number = t.client_number
          LEFT JOIN LATERAL (
            SELECT ci.id_type, ci.id_value
            FROM client_id ci
            WHERE ci.client_number = c.client_number
            ORDER BY ci.id ASC
            LIMIT 1
          ) primary_id ON TRUE
          LEFT JOIN ticket_item ti ON ti.ticket_number = t.ticket_number
          LEFT JOIN item i ON i.item_number = ti.item_number
          LEFT JOIN item_subcategory isc ON isc.id = i.subcategory_id
          LEFT JOIN item_category ic ON ic.id = isc.category_id
          WHERE t.transaction_datetime >= $1::date
            AND t.transaction_datetime < ($2::date + INTERVAL '1 day')
          ORDER BY t.transaction_datetime ASC, t.ticket_number ASC, i.item_number ASC
        `,
        [fromDate, toDate],
      );

      return result.rows.map(mapRow);
    } finally {
      client.release();
    }
  },

  loadSubmissionMap: async (
    ticketNumbers: number[],
    environment: XmlReportEnvironment,
  ): Promise<Map<number, XmlReportSubmissionRecord>> => {
    if (!ticketNumbers.length) {
      return new Map();
    }

    const client = await connect();
    try {
      const result = await client.query(
        `
          SELECT ticket_number, status, message
          FROM xml_report_submission
          WHERE environment = $1
            AND ticket_number = ANY($2::int[])
        `,
        [environment, ticketNumbers],
      );

      return new Map(
        result.rows.map((row) => [
          number(row.ticket_number),
          {
            ticket_number: number(row.ticket_number),
            status: text(row.status) as "submitted" | "failed",
            message: text(row.message),
          },
        ]),
      );
    } finally {
      client.release();
    }
  },

  saveSubmissionResult: async (input: {
    ticket_number: number;
    ticket_type: "Pawn" | "Buy";
    ticket_datetime: string;
    environment: XmlReportEnvironment;
    status: "submitted" | "failed";
    error_code: number;
    message: string;
  }): Promise<void> => {
    const client = await connect();
    try {
      await client.query(
        `
          INSERT INTO xml_report_submission (
            ticket_number,
            ticket_type,
            ticket_datetime,
            environment,
            status,
            error_code,
            message,
            submitted_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            CASE WHEN $5 = 'submitted' THEN CURRENT_TIMESTAMP ELSE NULL END
          )
          ON CONFLICT (
            ticket_number,
            ticket_type,
            ticket_datetime,
            environment
          ) DO UPDATE SET
            status = EXCLUDED.status,
            attempt_count = xml_report_submission.attempt_count + 1,
            error_code = EXCLUDED.error_code,
            message = EXCLUDED.message,
            submitted_at = CASE
              WHEN EXCLUDED.status = 'submitted' THEN CURRENT_TIMESTAMP
              ELSE xml_report_submission.submitted_at
            END,
            last_attempt_at = CURRENT_TIMESTAMP
        `,
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
    } finally {
      client.release();
    }
  },
};
