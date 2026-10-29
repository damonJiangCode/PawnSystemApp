import type { IpcMainInvokeEvent } from "electron";
import type {
  ConvertTicketInput,
  ExtendTicketsInput,
  ExpireTicketInput,
  MarkTicketStolenInput,
  PickupTicketsInput,
  ReverseTicketFormField,
  ReverseTicketInput,
  CreatePawnTicketInput,
  CreateSellTicketInput,
  TransferTicketInput,
  UpdateTicketInput,
  TicketFormField,
} from "../../../../../shared/payload-contracts/ticket.contract.ts";
import type {
  ReverseTicketMutationResult,
  TicketMutationResult,
} from "../../../../../shared/api-contracts/ticketApi.contract.ts";
import type { Ticket } from "../../../../../shared/models/ticket.model.ts";
import { ticketPaymentService } from "./ticket-payment.service.ts";
import { ticketService } from "./ticket.service.ts";
import { ticketReversalService } from "./ticket-reversal.service.ts";
import { CHANNELS } from "../../ipc/channels.ts";
import { extractFieldError } from "../../shared/createFieldError.ts";

const { ipcMain } = require("electron/main") as typeof import("electron");

const runReverseTicketMutation = async (
  input: ReverseTicketInput,
): Promise<ReverseTicketMutationResult> => {
  try {
    return {
      ok: true,
      result: await ticketReversalService.reverseTicket(input),
    };
  } catch (error) {
    const fieldError = extractFieldError(error);

    if (fieldError) {
      return {
        ok: false,
        field: fieldError.field as ReverseTicketFormField,
        message: fieldError.message,
      };
    }

    throw error;
  }
};

const runTicketMutation = async (
  operation: () => Promise<Ticket>,
): Promise<TicketMutationResult> => {
  try {
    return { ok: true, ticket: await operation() };
  } catch (error) {
    const fieldError = extractFieldError(error);

    if (fieldError) {
      return {
        ok: false,
        field: fieldError.field as TicketFormField,
        message: fieldError.message,
      };
    }

    throw error;
  }
};

export const registerTicketHandlers = () => {
  ipcMain.handle(
    CHANNELS.ADD_PAWN_TICKET,
    async (_event: IpcMainInvokeEvent, payload: CreatePawnTicketInput) => {
      return runTicketMutation(() => ticketService.createPawnTicket(payload));
    },
  );
  ipcMain.handle(
    CHANNELS.ADD_SELL_TICKET,
    async (_event: IpcMainInvokeEvent, payload: CreateSellTicketInput) => {
      return runTicketMutation(() => ticketService.createSellTicket(payload));
    },
  );
  ipcMain.handle(
    CHANNELS.UPDATE_TICKET,
    async (_event: IpcMainInvokeEvent, payload: UpdateTicketInput) => {
      return runTicketMutation(() => ticketService.updateTicket(payload));
    },
  );
  ipcMain.handle(
    CHANNELS.CONVERT_TICKET,
    async (_event: IpcMainInvokeEvent, payload: ConvertTicketInput) => {
      return runTicketMutation(() => ticketService.convertTicket(payload));
    },
  );
  ipcMain.handle(
    CHANNELS.EXPIRE_TICKET,
    async (_event: IpcMainInvokeEvent, payload: ExpireTicketInput) => {
      return runTicketMutation(() => ticketService.expireTicket(payload));
    },
  );
  ipcMain.handle(
    CHANNELS.MARK_TICKET_STOLEN,
    async (_event: IpcMainInvokeEvent, payload: MarkTicketStolenInput) => {
      return runTicketMutation(() => ticketService.markTicketStolen(payload));
    },
  );
  ipcMain.handle(
    CHANNELS.PICKUP_TICKETS,
    async (_event: IpcMainInvokeEvent, payload: PickupTicketsInput) => {
      return ticketPaymentService.pickupTickets(payload);
    },
  );
  ipcMain.handle(
    CHANNELS.EXTEND_TICKETS,
    async (_event: IpcMainInvokeEvent, payload: ExtendTicketsInput) => {
      return ticketPaymentService.extendTickets(payload);
    },
  );
  ipcMain.handle(
    CHANNELS.GET_TRANSFER_TICKET_PREVIEW,
    async (_event: IpcMainInvokeEvent, ticketNumber: number) => {
      return ticketService.loadTransferTicketPreview(ticketNumber);
    },
  );
  ipcMain.handle(
    CHANNELS.TRANSFER_TICKET,
    async (_event: IpcMainInvokeEvent, payload: TransferTicketInput) => {
      return runTicketMutation(() => ticketService.transferTicket(payload));
    },
  );
  ipcMain.handle(
    CHANNELS.REVERSE_TICKET,
    async (_event: IpcMainInvokeEvent, input: ReverseTicketInput) =>
      runReverseTicketMutation(input),
  );
};
