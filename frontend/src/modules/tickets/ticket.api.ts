import type { TicketApi } from "../../../../shared/api-contracts/ticketApi.contract";
import type { Ticket } from "../../../../shared/models/ticket.model";
import type {
  ConvertTicketInput,
  CreatePawnTicketInput,
  CreateSellTicketInput,
  ExpireTicketInput,
  ExtendTicketsInput,
  MarkTicketStolenInput,
  PickupTicketsInput,
  ReverseTicketInput,
  ReverseTicketResult,
  TicketSearchResult,
  TransferTicketInput,
  TransferTicketPreview,
  UpdateTicketInput,
} from "../../../../shared/payload-contracts/ticket.contract";
import { getAppApi } from "../../shared/api/app.api";
import {
  createEnvelopePrintHtml,
  type PrintClient,
} from "./print/ticketPrintTemplate";

const api = (): TicketApi => {
  const ticket = getAppApi()?.ticket;
  if (!ticket) throw new Error("Ticket API is unavailable.");
  return ticket;
};

const isTicketNumber = (value: number) =>
  Number.isInteger(value) && value > 0;

const openPrintWindow = (html: string) => {
  const printWindow = window.open("", "_blank", "width=445,height=900");

  if (!printWindow) {
    window.alert("Unable to open print window.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

// The server validates and normalizes every request; errors keep its
// `field`/`status` so dialogs can show them under the right input.
export const ticketApi = {
  printEnvelopeTicket: (ticket: Ticket, client?: PrintClient) => {
    openPrintWindow(createEnvelopePrintHtml(ticket, client));
  },

  loadTickets: async (clientNumber?: number): Promise<Ticket[]> =>
    clientNumber ? api().loadTicketsByClient(clientNumber) : [],

  searchTicketByNumber: async (
    ticketNumber: number,
  ): Promise<TicketSearchResult | null> =>
    isTicketNumber(Number(ticketNumber))
      ? api().searchTicketByNumber(Number(ticketNumber))
      : null,

  searchPaymentTicketByNumber: async (
    ticketNumber: number,
  ): Promise<TicketSearchResult | null> =>
    isTicketNumber(Number(ticketNumber))
      ? api().searchPaymentTicketByNumber(Number(ticketNumber))
      : null,

  createPawnTicket: (input: CreatePawnTicketInput): Promise<Ticket> =>
    api().createPawnTicket(input),

  createSellTicket: (input: CreateSellTicketInput): Promise<Ticket> =>
    api().createSellTicket(input),

  updateTicket: (input: UpdateTicketInput): Promise<Ticket> =>
    api().updateTicket(input),

  convertTicket: (input: ConvertTicketInput): Promise<Ticket> =>
    api().convertTicket(input),

  loadTransferTicketPreview: async (
    ticketNumber: number,
  ): Promise<TransferTicketPreview | null> =>
    isTicketNumber(Number(ticketNumber))
      ? api().loadTransferTicketPreview(Number(ticketNumber))
      : null,

  transferTicket: (input: TransferTicketInput): Promise<Ticket> =>
    api().transferTicket(input),

  pickupTickets: async (input: PickupTicketsInput): Promise<Ticket[]> =>
    input.tickets.length ? api().pickupTickets(input) : [],

  extendTickets: async (input: ExtendTicketsInput): Promise<Ticket[]> =>
    input.extensions.length ? api().extendTickets(input) : [],

  expireTicket: (input: ExpireTicketInput): Promise<Ticket> =>
    api().expireTicket(input),

  markTicketStolen: (input: MarkTicketStolenInput): Promise<Ticket> =>
    api().markTicketStolen(input),

  unmarkTicketStolen: (ticketNumber: number): Promise<Ticket> =>
    api().unmarkTicketStolen(ticketNumber),

  reverseTicket: (input: ReverseTicketInput): Promise<ReverseTicketResult> =>
    api().reverseTicket(input),
};

export type {
  ConvertTicketInput,
  CreatePawnTicketInput,
  CreateSellTicketInput,
  ExpireTicketInput,
  ExtendTicketsInput,
  MarkTicketStolenInput,
  PickupTicketsInput,
  ReverseTicketInput,
  ReverseTicketResult,
  TransferTicketInput,
  TransferTicketPreview,
  UpdateTicketInput,
};
export type {
  TicketFormError,
  TicketFormField,
} from "./helpers/ticketApiUtils";
