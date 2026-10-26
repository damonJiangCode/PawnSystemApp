import type { Ticket } from "../../../../shared/models/ticket.model";
import type { TicketMutationResult } from "../../../../shared/api-contracts/ticketApi.contract";
import type { HolidayDate } from "../../../../shared/models/holiday-date.model";
import type { Location } from "../../../../shared/models/location.model";
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
  ReverseTicketResult,
  TicketSearchResult,
  TransferTicketInput,
  TransferTicketPreview,
  UpdateTicketInput,
  SaveHolidayInput,
  SaveLocationInput,
} from "../../../../shared/payload-contracts/ticket.contract";
import { getAppApi } from "../../shared/api/app.api";
import {
  createEnvelopePrintHtml,
  type PrintClient,
} from "./print/ticketPrintTemplate";
import {
  type TicketFormError,
  mapBackendError,
  normalizeConvertTicketInput,
  normalizeCreatePawnTicketInput,
  normalizeCreateSellTicketInput,
  normalizeExpireTicketInput,
  normalizeExtendTicketsInput,
  normalizeMarkTicketStolenInput,
  normalizePickupTicketsInput,
  normalizeReverseTicketInput,
  normalizeTransferTicketInput,
  normalizeUpdateTicketInput,
} from "./helpers/ticketApiUtils";

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

const unwrapTicketMutation = (result: TicketMutationResult): Ticket => {
  if (result.ok) {
    return result.ticket;
  }

  const error = new Error(result.message) as TicketFormError;
  error.field = result.field;
  throw error;
};

export const ticketApi = {
  printEnvelopeTicket: (ticket: Ticket, client?: PrintClient) => {
    openPrintWindow(createEnvelopePrintHtml(ticket, client));
  },

  loadTickets: async (clientNumber?: number): Promise<Ticket[]> => {
    if (!clientNumber) {
      return [];
    }

    const api = getAppApi()?.ticket;
    if (!api) {
      throw new Error("Ticket API is unavailable.");
    }

    return api.loadTicketsByClient(clientNumber);
  },

  loadHolidayDates: async (): Promise<HolidayDate[]> => {
    const api = getAppApi()?.ticket;
    if (!api) {
      throw new Error("Ticket API is unavailable.");
    }

    return api.loadHolidayDates();
  },

  addHolidayDate: async (input: SaveHolidayInput): Promise<HolidayDate> => {
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error("Holiday API is unavailable.");
    }

    return api.addHolidayDate({
      holiday_date: input.holiday_date.trim(),
      name: input.name.trim(),
    });
  },

  deleteHolidayDate: async (holidayDate: string): Promise<HolidayDate> => {
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error("Holiday API is unavailable.");
    }

    return api.deleteHolidayDate(holidayDate.trim());
  },

  loadLocations: async (): Promise<string[]> => {
    const api = getAppApi()?.ticket;
    if (!api) {
      throw new Error("Ticket API is unavailable.");
    }

    return api.loadLocations();
  },

  loadLocationsForAdmin: async (): Promise<Location[]> => {
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error("Location API is unavailable.");
    }

    return api.loadLocationsForAdmin();
  },

  addLocation: async (input: SaveLocationInput): Promise<Location> => {
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error("Location API is unavailable.");
    }

    return api.addLocation({
      location: input.location.trim().toUpperCase(),
      description: input.description.trim(),
    });
  },

  deactivateLocation: async (location: string): Promise<Location> => {
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error("Location API is unavailable.");
    }

    return api.deactivateLocation(location.trim().toUpperCase());
  },

  searchPaymentTicketByNumber: async (
    ticketNumber: number,
  ): Promise<TicketSearchResult | null> => {
    const normalizedTicketNumber = Number(ticketNumber);
    const api = getAppApi()?.ticket;

    if (
      !Number.isFinite(normalizedTicketNumber) ||
      normalizedTicketNumber <= 0
    ) {
      return null;
    }

    if (!api) {
      throw new Error("Ticket API is unavailable.");
    }

    try {
      return await api.searchPaymentTicketByNumber(normalizedTicketNumber);
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  searchTicketByNumber: async (
    ticketNumber: number,
  ): Promise<TicketSearchResult | null> => {
    const normalizedTicketNumber = Number(ticketNumber);
    const api = getAppApi()?.ticket;

    if (
      !Number.isFinite(normalizedTicketNumber) ||
      normalizedTicketNumber <= 0
    ) {
      return null;
    }

    if (!api) {
      throw new Error("Ticket API is unavailable.");
    }

    try {
      return await api.searchTicketByNumber(normalizedTicketNumber);
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  createPawnTicket: async (input: CreatePawnTicketInput): Promise<Ticket> => {
    const normalizedInput = normalizeCreatePawnTicketInput(input);
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error(
        "[ticketApi] createPawnTicket(): Cannot get api from Electron",
      );
    }

    try {
      return unwrapTicketMutation(await api.createPawnTicket(normalizedInput));
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  createSellTicket: async (input: CreateSellTicketInput): Promise<Ticket> => {
    const normalizedInput = normalizeCreateSellTicketInput(input);
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error(
        "[ticketApi] createSellTicket(): Cannot get api from Electron",
      );
    }

    try {
      return unwrapTicketMutation(await api.createSellTicket(normalizedInput));
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  updateTicket: async (input: UpdateTicketInput): Promise<Ticket> => {
    const normalizedInput = normalizeUpdateTicketInput(input);
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error(
        "[ticketApi] updateTicket(): Cannot get api from Electron",
      );
    }

    try {
      return unwrapTicketMutation(await api.updateTicket(normalizedInput));
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  convertTicket: async (input: ConvertTicketInput): Promise<Ticket> => {
    const normalizedInput = normalizeConvertTicketInput(input);
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error(
        "[ticketApi] convertTicket(): Cannot get api from Electron",
      );
    }

    try {
      return unwrapTicketMutation(await api.convertTicket(normalizedInput));
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  expireTicket: async (input: ExpireTicketInput): Promise<Ticket> => {
    const normalizedInput = normalizeExpireTicketInput(input);
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error(
        "[ticketApi] expireTicket(): Cannot get api from Electron",
      );
    }

    try {
      return unwrapTicketMutation(await api.expireTicket(normalizedInput));
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  markTicketStolen: async (input: MarkTicketStolenInput): Promise<Ticket> => {
    const normalizedInput = normalizeMarkTicketStolenInput(input);
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error(
        "[ticketApi] markTicketStolen(): Cannot get api from Electron",
      );
    }

    try {
      return unwrapTicketMutation(await api.markTicketStolen(normalizedInput));
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  pickupTickets: async (input: PickupTicketsInput): Promise<Ticket[]> => {
    const normalizedInput = normalizePickupTicketsInput(input);
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error(
        "[ticketApi] pickupTickets(): Cannot get api from Electron",
      );
    }

    if (!normalizedInput.tickets.length) {
      return [];
    }

    try {
      return await api.pickupTickets(normalizedInput);
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  extendTickets: async (input: ExtendTicketsInput): Promise<Ticket[]> => {
    const normalizedInput = normalizeExtendTicketsInput(input);
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error(
        "[ticketApi] extendTickets(): Cannot get api from Electron",
      );
    }

    if (!normalizedInput.extensions.length) {
      return [];
    }

    try {
      return await api.extendTickets(normalizedInput);
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  loadBuybackReport: async (
    input: ReportDateRangeInput,
  ): Promise<BuybackReportResult> => {
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error(
        "[ticketApi] loadBuybackReport(): Cannot get api from Electron",
      );
    }

    try {
      return await api.loadBuybackReport({
        from_date: input.from_date.trim(),
        to_date: input.to_date.trim(),
      });
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  loadInterestReport: async (
    input: ReportDateRangeInput,
  ): Promise<InterestReportResult> => {
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error(
        "[ticketApi] loadInterestReport(): Cannot get api from Electron",
      );
    }

    try {
      return await api.loadInterestReport({
        from_date: input.from_date.trim(),
        to_date: input.to_date.trim(),
      });
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  loadDailyReport: async (
    input: ReportDateRangeInput,
  ): Promise<DailyReportResult> => {
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error("Ticket API is unavailable.");
    }

    try {
      return await api.loadDailyReport({
        from_date: input.from_date.trim(),
        to_date: input.to_date.trim(),
      });
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  loadOverdueReport: async (
    input: OverdueReportInput,
  ): Promise<OverdueReportResult> => {
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error("Ticket API is unavailable.");
    }

    try {
      return await api.loadOverdueReport({
        due_on_or_before: input.due_on_or_before.trim(),
        location_from: input.location_from.trim().toUpperCase(),
        location_to: input.location_to.trim().toUpperCase(),
      });
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  loadTransferTicketPreview: async (
    ticketNumber: number,
  ): Promise<TransferTicketPreview | null> => {
    const normalizedTicketNumber = Number(ticketNumber);
    const api = getAppApi()?.ticket;

    if (
      !Number.isFinite(normalizedTicketNumber) ||
      normalizedTicketNumber <= 0
    ) {
      return null;
    }

    if (!api) {
      throw new Error("Ticket API is unavailable.");
    }

    try {
      return await api.loadTransferTicketPreview(normalizedTicketNumber);
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  transferTicket: async (input: TransferTicketInput): Promise<Ticket> => {
    const normalizedInput = normalizeTransferTicketInput(input);
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error(
        "[ticketApi] transferTicket(): Cannot get api from Electron",
      );
    }

    try {
      return unwrapTicketMutation(await api.transferTicket(normalizedInput));
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  reverseTicket: async (
    input: ReverseTicketInput,
  ): Promise<ReverseTicketResult> => {
    const api = getAppApi()?.ticket;

    if (!api) {
      throw new Error("Ticket API is unavailable.");
    }

    const result = await api.reverseTicket(normalizeReverseTicketInput(input));

    if (!result.ok) {
      const error = new Error(result.message) as TicketFormError;
      error.field = result.field;
      throw error;
    }

    return result.result;
  },
};

export type {
  ConvertTicketInput,
  BuybackReportResult,
  ExtendTicketsInput,
  ExpireTicketInput,
  InterestReportResult,
  OverdueReportInput,
  OverdueReportResult,
  MarkTicketStolenInput,
  PickupTicketsInput,
  CreatePawnTicketInput,
  CreateSellTicketInput,
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
