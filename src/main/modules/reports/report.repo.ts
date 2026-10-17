import { connect } from "../../database/connection.ts";

export type BuybackReportSourceRow = {
  ticket_number: number;
  pickup_datetime: Date;
  pickup_amount_paid: number;
  transaction_datetime: Date;
  amount: number;
  onetime_fee: number;
  interest_paid_months: number;
  partial_payment: number;
  description: string;
  client_name: string;
};

export type InterestReportRow = {
  ticket_number: number;
  months_paid: number;
  amount_paid: number;
  description: string;
  client_name: string;
  payment_datetime: Date;
};

export type DailyReportSourceRow = {
  ticket_number: number;
  ticket_amount: number;
  ticket_description: string;
  client_name: string;
  gender: string;
  eye_color: string;
  identifications: string;
  item_number?: number;
  quantity?: number;
  item_description: string;
  brand_name: string;
  model_number: string;
  serial_number: string;
  item_amount?: number;
};

export type OverdueReportSourceRow = {
  ticket_number: number;
  client_name: string;
  location: string;
  transaction_date: string;
  due_date: string;
  interest_paid_months: number;
  item_number?: number;
  item_description: string;
  brand_name: string;
  model_number: string;
  serial_number: string;
};

const clientDisplayNameSql = (alias: string) => `
  CONCAT(
    UPPER(${alias}.last_name),
    ', ',
    UPPER(${alias}.first_name),
    CASE
      WHEN COALESCE(TRIM(${alias}.middle_name), '') = '' THEN ''
      ELSE CONCAT(' ', UPPER(${alias}.middle_name))
    END
  )
`;

const mapBuybackReportRow = (
  row: Record<string, unknown>,
): BuybackReportSourceRow => ({
  ticket_number: Number(row.ticket_number),
  pickup_datetime: new Date(String(row.pickup_datetime)),
  pickup_amount_paid: Number(row.pickup_amount_paid ?? 0),
  transaction_datetime: new Date(String(row.transaction_datetime)),
  amount: Number(row.amount ?? 0),
  onetime_fee: Number(row.onetime_fee ?? 0),
  interest_paid_months: Number(row.interest_paid_months ?? 0),
  partial_payment: Number(row.partial_payment ?? 0),
  description: row.description ? String(row.description) : "",
  client_name: row.client_name ? String(row.client_name) : "",
});

const mapInterestReportRow = (
  row: Record<string, unknown>,
): InterestReportRow => ({
  ticket_number: Number(row.ticket_number),
  months_paid: Number(row.months_paid ?? 0),
  amount_paid: Number(row.amount_paid ?? 0),
  description: row.description ? String(row.description) : "",
  client_name: row.client_name ? String(row.client_name) : "",
  payment_datetime: new Date(String(row.payment_datetime)),
});

const textValue = (value: unknown) => (value ? String(value) : "");
const optionalNumber = (value: unknown) =>
  value === null || value === undefined ? undefined : Number(value);

const mapDailyReportRow = (
  row: Record<string, unknown>,
): DailyReportSourceRow => ({
  ticket_number: Number(row.ticket_number),
  ticket_amount: Number(row.ticket_amount ?? 0),
  ticket_description: textValue(row.ticket_description),
  client_name: textValue(row.client_name),
  gender: textValue(row.gender),
  eye_color: textValue(row.eye_color),
  identifications: textValue(row.identifications),
  item_number: optionalNumber(row.item_number),
  quantity: optionalNumber(row.quantity),
  item_description: textValue(row.item_description),
  brand_name: textValue(row.brand_name),
  model_number: textValue(row.model_number),
  serial_number: textValue(row.serial_number),
  item_amount: optionalNumber(row.item_amount),
});

const mapOverdueReportRow = (
  row: Record<string, unknown>,
): OverdueReportSourceRow => ({
  ticket_number: Number(row.ticket_number),
  client_name: textValue(row.client_name),
  location: textValue(row.location),
  transaction_date: textValue(row.transaction_date),
  due_date: textValue(row.due_date),
  interest_paid_months: Number(row.interest_paid_months ?? 0),
  item_number: optionalNumber(row.item_number),
  item_description: textValue(row.item_description),
  brand_name: textValue(row.brand_name),
  model_number: textValue(row.model_number),
  serial_number: textValue(row.serial_number),
});

export const reportRepo = {
  loadOverdueReportRows: async (
    dueOnOrBefore: string,
    locationPrefix: string,
    locationFromNumber: number,
    locationToNumber: number,
  ): Promise<OverdueReportSourceRow[]> => {
    const client = await connect();
    const query = `
      SELECT
        t.ticket_number,
        ${clientDisplayNameSql("c")} AS client_name,
        t.location,
        TO_CHAR(t.transaction_datetime, 'YYYY-MM-DD') AS transaction_date,
        TO_CHAR(t.due_date, 'YYYY-MM-DD') AS due_date,
        t.interest_paid_months,
        i.item_number,
        COALESCE(i.description, '') AS item_description,
        COALESCE(i.brand_name, '') AS brand_name,
        COALESCE(i.model_number, '') AS model_number,
        COALESCE(i.serial_number, '') AS serial_number
      FROM ticket t
      INNER JOIN client c ON c.client_number = t.client_number
      LEFT JOIN ticket_item ti ON ti.ticket_number = t.ticket_number
      LEFT JOIN item i ON i.item_number = ti.item_number
      WHERE t.status = 'pawned'
        AND (c.hold_until IS NULL OR c.hold_until < $1::date)
        AND t.due_date < ($1::date + INTERVAL '1 day')
        AND UPPER(SUBSTRING(t.location FROM '^[A-Za-z]+')) = $2
        AND CAST(SUBSTRING(t.location FROM '[0-9]+$') AS INTEGER)
          BETWEEN $3 AND $4
      ORDER BY
        CAST(SUBSTRING(t.location FROM '[0-9]+$') AS INTEGER) ASC,
        t.due_date ASC,
        t.ticket_number ASC,
        i.item_number ASC
    `;

    try {
      const result = await client.query(query, [
        dueOnOrBefore,
        locationPrefix,
        locationFromNumber,
        locationToNumber,
      ]);
      return result.rows.map(mapOverdueReportRow);
    } finally {
      client.release();
    }
  },

  loadDailyReportRows: async (
    fromDate: string,
    toDate: string,
  ): Promise<DailyReportSourceRow[]> => {
    const client = await connect();
    const query = `
      SELECT
        t.ticket_number,
        t.amount AS ticket_amount,
        COALESCE(t.description, '') AS ticket_description,
        ${clientDisplayNameSql("c")} AS client_name,
        COALESCE(c.gender, '') AS gender,
        COALESCE(c.eye_color, '') AS eye_color,
        COALESCE(ids.identifications, '') AS identifications,
        i.item_number,
        i.quantity,
        COALESCE(i.description, '') AS item_description,
        COALESCE(i.brand_name, '') AS brand_name,
        COALESCE(i.model_number, '') AS model_number,
        COALESCE(i.serial_number, '') AS serial_number,
        i.amount AS item_amount
      FROM ticket t
      LEFT JOIN client c ON c.client_number = t.client_number
      LEFT JOIN LATERAL (
        SELECT STRING_AGG(
          CONCAT(ci.id_type, ': ', ci.id_value),
          ' | ' ORDER BY ci.id
        ) AS identifications
        FROM client_id ci
        WHERE ci.client_number = c.client_number
      ) ids ON TRUE
      LEFT JOIN ticket_item ti ON ti.ticket_number = t.ticket_number
      LEFT JOIN item i ON i.item_number = ti.item_number
      WHERE t.transaction_datetime >= $1::date
        AND t.transaction_datetime < ($2::date + INTERVAL '1 day')
      ORDER BY t.transaction_datetime ASC, t.ticket_number ASC, i.item_number ASC
    `;

    try {
      const result = await client.query(query, [fromDate, toDate]);
      return result.rows.map(mapDailyReportRow);
    } finally {
      client.release();
    }
  },

  loadBuybackReportRows: async (
    fromDate: string,
    toDate: string,
  ): Promise<BuybackReportSourceRow[]> => {
    const client = await connect();
    const query = `
      SELECT
        t.ticket_number,
        t.pickup_datetime,
        t.pickup_amount_paid,
        t.amount,
        t.onetime_fee,
        t.transaction_datetime,
        t.interest_paid_months,
        t.partial_payment,
        t.description,
        ${clientDisplayNameSql("c")} AS client_name
      FROM ticket t
      LEFT JOIN client c ON c.client_number = t.client_number
      WHERE t.status = 'pawned_picked_up'
        AND t.pickup_datetime >= $1::date
        AND t.pickup_datetime < ($2::date + INTERVAL '1 day')
      ORDER BY t.pickup_datetime ASC, t.ticket_number ASC
    `;

    try {
      const result = await client.query(query, [fromDate, toDate]);
      return result.rows.map(mapBuybackReportRow);
    } finally {
      client.release();
    }
  },

  loadInterestReportRows: async (
    fromDate: string,
    toDate: string,
  ): Promise<InterestReportRow[]> => {
    const client = await connect();
    const query = `
      SELECT
        ip.ticket_number,
        ip.months_paid,
        ip.amount_paid,
        ip.payment_datetime,
        t.description,
        ${clientDisplayNameSql("c")} AS client_name
      FROM interest_payment ip
      INNER JOIN ticket t ON t.ticket_number = ip.ticket_number
      LEFT JOIN client c ON c.client_number = t.client_number
      WHERE ip.payment_datetime >= $1::date
        AND ip.payment_datetime < ($2::date + INTERVAL '1 day')
      ORDER BY ip.payment_datetime ASC, ip.ticket_number ASC
    `;

    try {
      const result = await client.query(query, [fromDate, toDate]);
      return result.rows.map(mapInterestReportRow);
    } finally {
      client.release();
    }
  },
};
