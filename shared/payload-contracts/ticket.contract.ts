import type { Client } from "../models/client.model.ts";

export type TicketFormField =
  | "target_status"
  | "description"
  | "location"
  | "amount"
  | "onetime_fee"
  | "employee_password"
  | "manager_password"
  | "ticket_number";
import type { Ticket } from "../models/ticket.model.ts";

type TicketDescriptionInput = {
  description: string;
  location: string;
  amount: number;
};

type EmployeeAuthorizedInput = {
  employee_password: string;
};

export type CreatePawnTicketInput = TicketDescriptionInput &
  EmployeeAuthorizedInput & {
    onetime_fee: number;
    client_number: number;
  };

export type CreateSellTicketInput = TicketDescriptionInput &
  EmployeeAuthorizedInput & {
    client_number: number;
  };

export type UpdateTicketInput = TicketDescriptionInput &
  EmployeeAuthorizedInput & {
    ticket_number: number;
    is_lost: boolean;
    onetime_fee: number;
    partial_payment: number;
  };

export type TransferTicketPreview = {
  ticket_number: number;
  status: Ticket["status"];
  description: string;
  location: string;
  amount: number;
  previous_client_number: number;
  previous_client_name: string;
};

export type TicketSearchResult = {
  ticket: Ticket;
  client: Client;
};

export type ReportDateRangeInput = {
  from_date: string;
  to_date: string;
};

export type DailyReportItem = {
  item_number: number;
  quantity: number;
  description: string;
  brand_name: string;
  model_number: string;
  serial_number: string;
  amount: number;
};

export type DailyReportTicket = {
  ticket_number: number;
  amount: number;
  description: string;
  client_name: string;
  gender: string;
  eye_color: string;
  identifications: string;
  items: DailyReportItem[];
};

export type DailyReportResult = ReportDateRangeInput & {
  tickets: DailyReportTicket[];
  missing_item_ticket_numbers: number[];
  total_tickets: number;
  total_items: number;
  total_amount: number;
};

export type BuybackReportRow = {
  ticket_number: number;
  pickup_datetime: Date;
  pickup_amount_paid: number;
  description: string;
  client_name: string;
};

export type BuybackReportResult = ReportDateRangeInput & {
  rows: BuybackReportRow[];
  total_buyback_price: number;
};

export type InterestReportRow = {
  ticket_number: number;
  months_paid: number;
  amount_paid: number;
  description: string;
  client_name: string;
  payment_datetime: Date;
};

export type InterestReportResult = ReportDateRangeInput & {
  rows: InterestReportRow[];
  total_interest_paid: number;
};

export type OverdueReportInput = {
  due_on_or_before: string;
  location_from: string;
  location_to: string;
};

export type OverdueReportItem = {
  description: string;
  brand_name: string;
  model_number: string;
  serial_number: string;
};

export type OverdueReportTicket = {
  ticket_number: number;
  client_name: string;
  location: string;
  transaction_date: string;
  due_date: string;
  interest_paid_months: number;
  items: OverdueReportItem[];
};

export type OverdueReportResult = OverdueReportInput & {
  tickets: OverdueReportTicket[];
  total_tickets: number;
  total_items: number;
};

export type TransferTicketInput = {
  ticket_number: number;
  client_number: number;
};

export type ReverseTicketInput = {
  ticket_number: number;
};

export type ReverseTicketFormField = "ticket_number";

export type ReverseTicketResult = {
  ticket: Ticket;
  client: Client;
  previous_status: "pawned_expired" | "pawned_picked_up";
};

export type ConvertTicketInput = TicketDescriptionInput &
  EmployeeAuthorizedInput & {
    ticket_number: number;
    target_status: "pawned" | "sold";
    onetime_fee: number;
  };

export type ExpireTicketInput = {
  ticket_number: number;
  employee_password?: string;
};

export type MarkTicketStolenInput = EmployeeAuthorizedInput & {
  ticket_number: number;
};

export type PickupTicketPaymentInput = {
  ticket_number: number;
  pickup_amount_paid: number;
};

export type PickupTicketsInput = {
  tickets: PickupTicketPaymentInput[];
};

export type ExtensionTicketPaymentInput = {
  ticket_number: number;
  months: number;
};

export type ExtendTicketsInput = {
  extensions: ExtensionTicketPaymentInput[];
};

export type SaveHolidayInput = {
  holiday_date: string;
  name: string;
};

export type SaveLocationInput = {
  location: string;
  description: string;
};
