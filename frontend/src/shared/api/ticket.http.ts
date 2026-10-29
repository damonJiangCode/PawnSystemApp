import type { TicketApi } from "../../../../shared/api-contracts/ticketApi.contract.ts";
import type { Client } from "../../../../shared/models/client.model.ts";
import type { Ticket } from "../../../../shared/models/ticket.model.ts";
import type {
  CreatePawnTicketInput,
  CreateSellTicketInput,
  TicketSearchResult,
} from "../../../../shared/payload-contracts/ticket.contract.ts";
import { restoreClientDates } from "./client.http.ts";
import { API_BASE_URL, apiUrl, jsonBody, requestJson } from "./http.ts";

// Ticket operations served over HTTP so far; the rest still use the desktop
// bridge until their migration slice lands.
export type HttpTicketMethods =
  | "loadTicketsByClient"
  | "searchTicketByNumber"
  | "searchPaymentTicketByNumber"
  | "createPawnTicket"
  | "createSellTicket";

type TicketResponse = Omit<
  Ticket,
  | "transaction_datetime"
  | "due_date"
  | "partial_payment_datetime"
  | "interested_datetime"
  | "pickup_datetime"
  | "pickup_amount_paid"
  | "expire_date"
  | "status_updated_at"
> & {
  transaction_datetime: string;
  due_date: string;
  partial_payment_datetime: string | null;
  interested_datetime: string | null;
  pickup_datetime: string | null;
  pickup_amount_paid: number | null;
  expire_date: string | null;
  status_updated_at: string;
};

const optionalDate = (value: string | null) =>
  value ? new Date(value) : undefined;

const toTicket = (ticket: TicketResponse): Ticket => ({
  ...ticket,
  transaction_datetime: new Date(ticket.transaction_datetime),
  due_date: new Date(ticket.due_date),
  partial_payment_datetime: optionalDate(ticket.partial_payment_datetime),
  interested_datetime: optionalDate(ticket.interested_datetime),
  pickup_datetime: optionalDate(ticket.pickup_datetime),
  pickup_amount_paid: ticket.pickup_amount_paid ?? undefined,
  expire_date: optionalDate(ticket.expire_date),
  status_updated_at: new Date(ticket.status_updated_at),
});

export async function loadTicketsByClientHttp(
  clientNumber: number,
  baseUrl = API_BASE_URL,
) {
  const url = apiUrl("/tickets", baseUrl);
  url.searchParams.set("client_number", String(clientNumber));
  const tickets = await requestJson<TicketResponse[]>(url);
  return tickets.map(toTicket);
}

// A missing ticket is a normal search outcome for the screens, not an error.
export async function searchTicketByNumberHttp(
  ticketNumber: number,
  baseUrl = API_BASE_URL,
): Promise<TicketSearchResult | null> {
  try {
    const result = await requestJson<{
      ticket: TicketResponse;
      client: Client;
    }>(apiUrl(`/tickets/${ticketNumber}`, baseUrl));
    return {
      ticket: toTicket(result.ticket),
      client: restoreClientDates(result.client),
    };
  } catch (error) {
    if ((error as { status?: number }).status === 404) return null;
    throw error;
  }
}

// Only the fields the server accepts are sent; dates and names are server-owned.
export async function createPawnTicketHttp(
  input: CreatePawnTicketInput,
  baseUrl = API_BASE_URL,
) {
  const ticket = await requestJson<TicketResponse>(
    apiUrl("/tickets/pawn", baseUrl),
    jsonBody("POST", {
      client_number: input.client_number,
      description: input.description,
      location: input.location,
      amount: input.amount,
      onetime_fee: input.onetime_fee,
      employee_password: input.employee_password,
    }),
  );
  return toTicket(ticket);
}

export async function createSellTicketHttp(
  input: CreateSellTicketInput,
  baseUrl = API_BASE_URL,
) {
  const ticket = await requestJson<TicketResponse>(
    apiUrl("/tickets/sell", baseUrl),
    jsonBody("POST", {
      client_number: input.client_number,
      description: input.description,
      location: input.location,
      amount: input.amount,
      employee_password: input.employee_password,
    }),
  );
  return toTicket(ticket);
}

export const createTicketHttpApi = (
  baseUrl = API_BASE_URL,
): Pick<TicketApi, HttpTicketMethods> => ({
  loadTicketsByClient: (clientNumber) =>
    loadTicketsByClientHttp(clientNumber, baseUrl),
  searchTicketByNumber: (ticketNumber) =>
    searchTicketByNumberHttp(ticketNumber, baseUrl),
  searchPaymentTicketByNumber: (ticketNumber) =>
    searchTicketByNumberHttp(ticketNumber, baseUrl),
  createPawnTicket: (input) => createPawnTicketHttp(input, baseUrl),
  createSellTicket: (input) => createSellTicketHttp(input, baseUrl),
});
