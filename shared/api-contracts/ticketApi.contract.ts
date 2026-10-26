import type { Ticket } from "../models/ticket.model.ts";
import type { HolidayDate } from "../models/holiday-date.model.ts";
import type { Location } from "../models/location.model.ts";
import type {
  ConvertTicketInput,
  BuybackReportResult,
  DailyReportResult,
  ExtendTicketsInput,
  ExpireTicketInput,
  InterestReportResult,
  OverdueReportInput,
  OverdueReportResult,
  MarkTicketStolenInput,
  PickupTicketsInput,
  CreatePawnTicketInput,
  CreateSellTicketInput,
  ReportDateRangeInput,
  ReverseTicketInput,
  ReverseTicketFormField,
  ReverseTicketResult,
  TicketSearchResult,
  TicketFormField,
  TransferTicketInput,
  TransferTicketPreview,
  UpdateTicketInput,
  SaveHolidayInput,
  SaveLocationInput,
} from "../payload-contracts/ticket.contract.ts";

export type ReverseTicketMutationResult =
  | { ok: true; result: ReverseTicketResult }
  | { ok: false; field: ReverseTicketFormField; message: string };

export type TicketMutationResult =
  | { ok: true; ticket: Ticket }
  | { ok: false; field: TicketFormField; message: string };

export type TicketApi = {
  loadTicketsByClient: (clientNumber: number) => Promise<Ticket[]>;
  loadHolidayDates: () => Promise<HolidayDate[]>;
  addHolidayDate: (input: SaveHolidayInput) => Promise<HolidayDate>;
  deleteHolidayDate: (holidayDate: string) => Promise<HolidayDate>;
  loadLocations: () => Promise<string[]>;
  loadLocationsForAdmin: () => Promise<Location[]>;
  addLocation: (input: SaveLocationInput) => Promise<Location>;
  deactivateLocation: (location: string) => Promise<Location>;
  searchTicketByNumber: (
    ticketNumber: number,
  ) => Promise<TicketSearchResult | null>;
  searchPaymentTicketByNumber: (
    ticketNumber: number,
  ) => Promise<TicketSearchResult | null>;
  loadBuybackReport: (
    input: ReportDateRangeInput,
  ) => Promise<BuybackReportResult>;
  loadDailyReport: (input: ReportDateRangeInput) => Promise<DailyReportResult>;
  loadInterestReport: (
    input: ReportDateRangeInput,
  ) => Promise<InterestReportResult>;
  loadOverdueReport: (
    input: OverdueReportInput,
  ) => Promise<OverdueReportResult>;
  createPawnTicket: (
    input: CreatePawnTicketInput,
  ) => Promise<TicketMutationResult>;
  createSellTicket: (
    input: CreateSellTicketInput,
  ) => Promise<TicketMutationResult>;
  updateTicket: (input: UpdateTicketInput) => Promise<TicketMutationResult>;
  convertTicket: (input: ConvertTicketInput) => Promise<TicketMutationResult>;
  expireTicket: (input: ExpireTicketInput) => Promise<TicketMutationResult>;
  markTicketStolen: (
    input: MarkTicketStolenInput,
  ) => Promise<TicketMutationResult>;
  pickupTickets: (input: PickupTicketsInput) => Promise<Ticket[]>;
  extendTickets: (input: ExtendTicketsInput) => Promise<Ticket[]>;
  loadTransferTicketPreview: (
    ticketNumber: number,
  ) => Promise<TransferTicketPreview | null>;
  transferTicket: (input: TransferTicketInput) => Promise<TicketMutationResult>;
  reverseTicket: (
    input: ReverseTicketInput,
  ) => Promise<ReverseTicketMutationResult>;
};
