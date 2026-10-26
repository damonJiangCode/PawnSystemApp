import type { connect } from "../../../../../database/connection.ts";
import type { Ticket } from "../../../../../shared/models/ticket.model.ts";

export type DbClient = Awaited<ReturnType<typeof connect>>;

export type AddTicketPayload = {
  transaction_datetime: Date;
  is_lost: boolean;
  location: string;
  description: string;
  due_date: Date;
  amount: number;
  onetime_fee: number;
  employee_name: string;
  status: Ticket["status"];
  client_number: number;
};

export type UpdateTicketPayload = {
  ticket_number: number;
  is_lost: boolean;
  location: string;
  description: string;
  amount: number;
  onetime_fee: number;
  partial_payment: number;
  employee_name: string;
};

export type ConvertTicketPayload = {
  ticket_number: number;
  status: Ticket["status"];
  description: string;
  location: string;
  amount: number;
  due_date: Date;
  onetime_fee: number;
  employee_name: string;
};

export type ExpireTicketPayload = {
  ticket_number: number;
  current_status: Ticket["status"];
  current_due_date: Date;
  status: Ticket["status"];
};

export type MarkTicketStolenPayload = {
  ticket_number: number;
};

export type PickupTicketsPayload = {
  tickets: {
    ticket_number: number;
    pickup_amount_paid: number;
  }[];
  pickup_datetime: Date;
};

export type ExtendTicketPayload = {
  ticket_number: number;
  months: number;
  interested_datetime: Date;
};
