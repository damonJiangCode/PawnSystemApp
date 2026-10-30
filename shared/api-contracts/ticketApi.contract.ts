import type { Ticket } from "../models/ticket.model.ts";
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
} from "../payload-contracts/ticket.contract.ts";

// Served by the NestJS /tickets routes. Failures reject with an Error carrying
// the server's `field` and HTTP `status`.
export type TicketApi = {
  loadTicketsByClient: (clientNumber: number) => Promise<Ticket[]>;
  searchTicketByNumber: (
    ticketNumber: number,
  ) => Promise<TicketSearchResult | null>;
  searchPaymentTicketByNumber: (
    ticketNumber: number,
  ) => Promise<TicketSearchResult | null>;
  createPawnTicket: (input: CreatePawnTicketInput) => Promise<Ticket>;
  createSellTicket: (input: CreateSellTicketInput) => Promise<Ticket>;
  updateTicket: (input: UpdateTicketInput) => Promise<Ticket>;
  convertTicket: (input: ConvertTicketInput) => Promise<Ticket>;
  loadTransferTicketPreview: (
    ticketNumber: number,
  ) => Promise<TransferTicketPreview | null>;
  transferTicket: (input: TransferTicketInput) => Promise<Ticket>;
  pickupTickets: (input: PickupTicketsInput) => Promise<Ticket[]>;
  extendTickets: (input: ExtendTicketsInput) => Promise<Ticket[]>;
  expireTicket: (input: ExpireTicketInput) => Promise<Ticket>;
  markTicketStolen: (input: MarkTicketStolenInput) => Promise<Ticket>;
  unmarkTicketStolen: (ticketNumber: number) => Promise<Ticket>;
  reverseTicket: (input: ReverseTicketInput) => Promise<ReverseTicketResult>;
};
