import type { TransferTicketPreview } from "../../../../../shared/payload-contracts/ticket.contract.ts";
import type { Ticket } from "../../../../../shared/models/ticket.model.ts";

export const ticketSelectColumns = `
  ticket_number,
  transaction_datetime,
  is_lost,
  is_stolen,
  location,
  description,
  due_date,
  amount,
  onetime_fee,
  interest_paid_months,
  partial_payment,
  partial_payment_datetime,
  interested_datetime,
  employee_name,
  pickup_datetime,
  pickup_amount_paid,
  expire_date,
  status,
  status_updated_at,
  client_number
`;

export const clientDisplayNameSql = (alias: string) => `
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

export const mapTransferTicketPreviewRow = (
  row: Record<string, unknown>,
): TransferTicketPreview => ({
  ticket_number: Number(row.ticket_number),
  status: row.status as Ticket["status"],
  description: row.description ? String(row.description) : "",
  location: row.location ? String(row.location) : "",
  amount: Number(row.amount ?? 0),
  previous_client_number: Number(row.previous_client_number),
  previous_client_name: row.previous_client_name
    ? String(row.previous_client_name)
    : "",
});

export const mapTicketRow = (row: Record<string, unknown>): Ticket => ({
  ticket_number: Number(row.ticket_number),
  transaction_datetime: new Date(String(row.transaction_datetime)),
  is_lost: Boolean(row.is_lost),
  is_stolen: Boolean(row.is_stolen),
  location: row.location ? String(row.location) : "",
  description: row.description ? String(row.description) : "",
  due_date: new Date(String(row.due_date)),
  amount: Number(row.amount ?? 0),
  onetime_fee: Number(row.onetime_fee ?? 0),
  interest_paid_months: Number(row.interest_paid_months ?? 0),
  partial_payment: Number(row.partial_payment ?? 0),
  partial_payment_datetime: row.partial_payment_datetime
    ? new Date(String(row.partial_payment_datetime))
    : undefined,
  interested_datetime: row.interested_datetime
    ? new Date(String(row.interested_datetime))
    : undefined,
  employee_name: row.employee_name ? String(row.employee_name) : "",
  pickup_datetime: row.pickup_datetime
    ? new Date(String(row.pickup_datetime))
    : undefined,
  pickup_amount_paid:
    row.pickup_amount_paid !== null && row.pickup_amount_paid !== undefined
      ? Number(row.pickup_amount_paid)
      : undefined,
  expire_date: row.expire_date ? new Date(String(row.expire_date)) : undefined,
  status: row.status as Ticket["status"],
  status_updated_at: row.status_updated_at
    ? new Date(String(row.status_updated_at))
    : new Date(String(row.transaction_datetime)),
  client_number: Number(row.client_number),
});
