import type { TicketApi } from "../../../../shared/api-contracts/ticketApi.contract.ts";
import type { Client } from "../../../../shared/models/client.model.ts";
import type { Ticket } from "../../../../shared/models/ticket.model.ts";
import type {
  ConvertTicketInput,
  CreatePawnTicketInput,
  CreateSellTicketInput,
  ExtendTicketsInput,
  MarkTicketStolenInput,
  PickupTicketsInput,
  ReverseTicketInput,
  ReverseTicketResult,
  TicketSearchResult,
  TransferTicketInput,
  TransferTicketPreview,
  UpdateTicketInput,
} from "../../../../shared/payload-contracts/ticket.contract.ts";
import { restoreClientDates } from "./client.http.ts";
import { API_BASE_URL, apiUrl, jsonBody, requestJson } from "./http.ts";

type TicketResponse = Omit<
  Ticket,
  | "transaction_datetime"
  | "due_date"
  | "interested_datetime"
  | "pickup_datetime"
  | "pickup_amount_paid"
  | "expire_date"
  | "status_updated_at"
> & {
  transaction_datetime: string;
  due_date: string;
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
  interested_datetime: optionalDate(ticket.interested_datetime),
  pickup_datetime: optionalDate(ticket.pickup_datetime),
  pickup_amount_paid: ticket.pickup_amount_paid ?? undefined,
  expire_date: optionalDate(ticket.expire_date),
  status_updated_at: new Date(ticket.status_updated_at),
});

const isNotFound = (error: unknown) =>
  (error as { status?: number }).status === 404;

const sendTicket = async (url: URL, init: RequestInit) =>
  toTicket(await requestJson<TicketResponse>(url, init));

const sendTickets = async (url: URL, init: RequestInit) =>
  (await requestJson<TicketResponse[]>(url, init)).map(toTicket);

export async function loadTicketsByClientHttp(
  clientNumber: number,
  baseUrl = API_BASE_URL,
) {
  const url = apiUrl("/tickets", baseUrl);
  url.searchParams.set("client_number", String(clientNumber));
  return sendTickets(url, {});
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
    if (isNotFound(error)) return null;
    throw error;
  }
}

// Only the fields the server accepts are sent; dates and names are server-owned.
export function createPawnTicketHttp(
  input: CreatePawnTicketInput,
  baseUrl = API_BASE_URL,
) {
  return sendTicket(
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
}

export function createSellTicketHttp(
  input: CreateSellTicketInput,
  baseUrl = API_BASE_URL,
) {
  return sendTicket(
    apiUrl("/tickets/sell", baseUrl),
    jsonBody("POST", {
      client_number: input.client_number,
      description: input.description,
      location: input.location,
      amount: input.amount,
      employee_password: input.employee_password,
    }),
  );
}

export function updateTicketHttp(
  input: UpdateTicketInput,
  baseUrl = API_BASE_URL,
) {
  return sendTicket(
    apiUrl(`/tickets/${input.ticket_number}`, baseUrl),
    jsonBody("PATCH", {
      description: input.description,
      location: input.location,
      amount: input.amount,
      onetime_fee: input.onetime_fee,
      is_lost: input.is_lost,
      employee_password: input.employee_password,
    }),
  );
}

export function convertTicketHttp(
  input: ConvertTicketInput,
  baseUrl = API_BASE_URL,
) {
  return sendTicket(
    apiUrl(`/tickets/${input.ticket_number}/convert`, baseUrl),
    jsonBody("POST", {
      target_status: input.target_status,
      description: input.description,
      location: input.location,
      amount: input.amount,
      onetime_fee: input.onetime_fee,
      employee_password: input.employee_password,
    }),
  );
}

export async function loadTransferTicketPreviewHttp(
  ticketNumber: number,
  baseUrl = API_BASE_URL,
): Promise<TransferTicketPreview | null> {
  try {
    return await requestJson<TransferTicketPreview>(
      apiUrl(`/tickets/${ticketNumber}/transfer-preview`, baseUrl),
    );
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export function transferTicketHttp(
  input: TransferTicketInput,
  baseUrl = API_BASE_URL,
) {
  return sendTicket(
    apiUrl(`/tickets/${input.ticket_number}/transfer`, baseUrl),
    jsonBody("POST", { client_number: input.client_number }),
  );
}

// The amounts are what the payment window showed; the server rejects the
// whole batch (409) if its own amount differs.
export function pickupTicketsHttp(
  input: PickupTicketsInput,
  baseUrl = API_BASE_URL,
) {
  return sendTickets(
    apiUrl("/tickets/pickups", baseUrl),
    jsonBody("POST", {
      tickets: input.tickets.map((ticket) => ({
        ticket_number: ticket.ticket_number,
        amount: ticket.pickup_amount_paid,
      })),
    }),
  );
}

export function extendTicketsHttp(
  input: ExtendTicketsInput,
  baseUrl = API_BASE_URL,
) {
  return sendTickets(
    apiUrl("/tickets/extensions", baseUrl),
    jsonBody("POST", {
      extensions: input.extensions.map((extension) => ({
        ticket_number: extension.ticket_number,
        months: extension.months,
        amount: extension.amount,
      })),
    }),
  );
}

export function expireTicketHttp(ticketNumber: number, baseUrl = API_BASE_URL) {
  return sendTicket(apiUrl(`/tickets/${ticketNumber}/expire`, baseUrl), {
    method: "POST",
  });
}

export function setTicketStolenHttp(
  ticketNumber: number,
  input: Omit<MarkTicketStolenInput, "ticket_number"> | null,
  baseUrl = API_BASE_URL,
) {
  return sendTicket(
    apiUrl(`/tickets/${ticketNumber}/stolen`, baseUrl),
    jsonBody(
      "PATCH",
      input
        ? { is_stolen: true, employee_password: input.employee_password }
        : { is_stolen: false },
    ),
  );
}

export async function reverseTicketHttp(
  input: ReverseTicketInput,
  baseUrl = API_BASE_URL,
): Promise<ReverseTicketResult> {
  const result = await requestJson<{
    ticket: TicketResponse;
    client: Client;
    previous_status: ReverseTicketResult["previous_status"];
  }>(
    apiUrl(`/tickets/${input.ticket_number}/reverse`, baseUrl),
    jsonBody("POST", { employee_password: input.employee_password }),
  );
  return {
    ticket: toTicket(result.ticket),
    client: restoreClientDates(result.client),
    previous_status: result.previous_status,
  };
}

export const createTicketHttpApi = (baseUrl = API_BASE_URL): TicketApi => ({
  loadTicketsByClient: (clientNumber) =>
    loadTicketsByClientHttp(clientNumber, baseUrl),
  searchTicketByNumber: (ticketNumber) =>
    searchTicketByNumberHttp(ticketNumber, baseUrl),
  searchPaymentTicketByNumber: (ticketNumber) =>
    searchTicketByNumberHttp(ticketNumber, baseUrl),
  createPawnTicket: (input) => createPawnTicketHttp(input, baseUrl),
  createSellTicket: (input) => createSellTicketHttp(input, baseUrl),
  updateTicket: (input) => updateTicketHttp(input, baseUrl),
  convertTicket: (input) => convertTicketHttp(input, baseUrl),
  loadTransferTicketPreview: (ticketNumber) =>
    loadTransferTicketPreviewHttp(ticketNumber, baseUrl),
  transferTicket: (input) => transferTicketHttp(input, baseUrl),
  pickupTickets: (input) => pickupTicketsHttp(input, baseUrl),
  extendTickets: (input) => extendTicketsHttp(input, baseUrl),
  expireTicket: (input) => expireTicketHttp(input.ticket_number, baseUrl),
  markTicketStolen: ({ ticket_number, ...input }) =>
    setTicketStolenHttp(ticket_number, input, baseUrl),
  unmarkTicketStolen: (ticketNumber) =>
    setTicketStolenHttp(ticketNumber, null, baseUrl),
  reverseTicket: (input) => reverseTicketHttp(input, baseUrl),
});
