export type TicketStatus =
  'pawned' | 'pawned_expired' | 'pawned_picked_up' | 'sold' | 'sold_expired';

export type TicketRecord = {
  ticket_number: number;
  transaction_datetime: Date;
  is_lost: boolean;
  is_stolen: boolean;
  location: string;
  description: string;
  due_date: Date;
  amount: number;
  onetime_fee: number;
  interest_paid_months: number;
  recorded_interest_amount_paid: number;
  recorded_interest_months_paid: number;
  partial_payment: number;
  partial_payment_datetime: Date | null;
  interested_datetime: Date | null;
  employee_name: string;
  pickup_datetime: Date | null;
  pickup_amount_paid: number | null;
  expire_date: Date | null;
  status: TicketStatus;
  status_updated_at: Date;
  client_number: number;
};

// Recorded interest payments are summed per ticket in the same query.
export const ticketSelect = `
  SELECT t.ticket_number, t.transaction_datetime, t.is_lost, t.is_stolen,
    t.location, t.description, t.due_date, t.amount, t.onetime_fee,
    t.interest_paid_months, t.partial_payment, t.partial_payment_datetime,
    t.interested_datetime, t.employee_name, t.pickup_datetime,
    t.pickup_amount_paid, t.expire_date, t.status, t.status_updated_at,
    t.client_number,
    COALESCE(ip.amount_paid, 0) AS recorded_interest_amount_paid,
    COALESCE(ip.months_paid, 0) AS recorded_interest_months_paid
  FROM ticket t
  LEFT JOIN LATERAL (
    SELECT SUM(amount_paid) AS amount_paid, SUM(months_paid) AS months_paid
    FROM interest_payment
    WHERE interest_payment.ticket_number = t.ticket_number
  ) ip ON TRUE`;

// pg returns NUMERIC and SUM(...) as strings; amounts fit safely in a number.
const toNumber = (value: unknown) => Number(value ?? 0);
const toDateOrNull = (value: unknown) =>
  value === null || value === undefined ? null : (value as Date);

export const mapTicketRow = (row: Record<string, unknown>): TicketRecord => ({
  ticket_number: Number(row.ticket_number),
  transaction_datetime: row.transaction_datetime as Date,
  is_lost: Boolean(row.is_lost),
  is_stolen: Boolean(row.is_stolen),
  location: String(row.location ?? ''),
  description: String(row.description ?? ''),
  due_date: row.due_date as Date,
  amount: toNumber(row.amount),
  onetime_fee: toNumber(row.onetime_fee),
  interest_paid_months: toNumber(row.interest_paid_months),
  recorded_interest_amount_paid: toNumber(row.recorded_interest_amount_paid),
  recorded_interest_months_paid: toNumber(row.recorded_interest_months_paid),
  partial_payment: toNumber(row.partial_payment),
  partial_payment_datetime: toDateOrNull(row.partial_payment_datetime),
  interested_datetime: toDateOrNull(row.interested_datetime),
  employee_name: String(row.employee_name ?? ''),
  pickup_datetime: toDateOrNull(row.pickup_datetime),
  pickup_amount_paid:
    row.pickup_amount_paid === null || row.pickup_amount_paid === undefined
      ? null
      : Number(row.pickup_amount_paid),
  expire_date: toDateOrNull(row.expire_date),
  status: row.status as TicketStatus,
  status_updated_at: (row.status_updated_at ??
    row.transaction_datetime) as Date,
  client_number: Number(row.client_number),
});
