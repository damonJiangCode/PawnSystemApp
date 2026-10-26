import type {
  ReverseTicketInput,
  ReverseTicketResult,
} from "../../../../../shared/payload-contracts/ticket.contract.ts";
import { clientRepo } from "../clients/client.repo.ts";
import { createFieldError } from "../../shared/createFieldError.ts";
import { runInTransaction } from "../../shared/runInTransaction.ts";
import { ticketInput } from "./ticket.input.ts";
import {
  ticketReversalRepo,
  type ReversibleTicketStatus,
} from "./ticket-reversal.repo.ts";

const reversibleStatuses = new Set<ReversibleTicketStatus>([
  "pawned_expired",
  "pawned_picked_up",
]);

const isReversibleStatus = (status: string): status is ReversibleTicketStatus =>
  reversibleStatuses.has(status as ReversibleTicketStatus);

export const ticketReversalService = {
  reverseTicket: async (
    input: ReverseTicketInput,
  ): Promise<ReverseTicketResult> => {
    const normalizedInput = ticketInput.normalizeReverseTicket(input);

    if (
      !Number.isInteger(normalizedInput.ticket_number) ||
      normalizedInput.ticket_number <= 0
    ) {
      throw createFieldError("ticket_number", "Enter a valid ticket number.");
    }

    return runInTransaction("reverseTicket", async (client) => {
      const ticket = await ticketReversalRepo.loadTicketForUpdate(
        normalizedInput.ticket_number,
        client,
      );

      if (!ticket) {
        throw createFieldError("ticket_number", "That ticket was not found.");
      }

      if (!isReversibleStatus(ticket.status)) {
        throw createFieldError(
          "ticket_number",
          "Only expired or picked-up pawn tickets can be reversed.",
        );
      }

      const conflictingLinkedTicket =
        await ticketReversalRepo.findConflictingLinkedTicket(
          normalizedInput.ticket_number,
          client,
        );

      if (conflictingLinkedTicket) {
        throw createFieldError(
          "ticket_number",
          `Item #${conflictingLinkedTicket.itemNumber} is linked to a newer or active ticket #${conflictingLinkedTicket.ticketNumber}.`,
        );
      }

      const previousStatus = ticket.status;
      const reversedTicket = await ticketReversalRepo.reverse(ticket, client);
      const updatedClient = await clientRepo.loadByNumber(
        ticket.client_number,
        client,
      );

      if (!updatedClient) {
        throw new Error(
          `[ticketReversalService] Client #${ticket.client_number} was not found after reversal.`,
        );
      }

      return {
        ticket: reversedTicket,
        client: updatedClient,
        previous_status: previousStatus,
      };
    });
  },
};
