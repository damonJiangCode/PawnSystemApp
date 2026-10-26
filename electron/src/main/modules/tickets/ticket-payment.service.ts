import type { Ticket } from "../../../../../shared/models/ticket.model.ts";
import type {
  ExtendTicketsInput,
  PickupTicketsInput,
} from "../../../../../shared/payload-contracts/ticket.contract.ts";
import { calculation } from "../../../../../shared/utils/calculation.ts";
import { getTicketPickupAmount } from "../../../../../shared/utils/ticketFinance.ts";
import { interestPaymentRepo } from "./interest-payment.repo.ts";
import { ticketRepo } from "./ticket.repo.ts";
import { createFieldError } from "../../shared/createFieldError.ts";
import { runInTransaction } from "../../shared/runInTransaction.ts";
import { ticketInput } from "./ticket.input.ts";

export const ticketPaymentService = {
  pickupTickets: async (input: PickupTicketsInput): Promise<Ticket[]> => {
    const normalizedInput = ticketInput.normalizePickupTickets(input);

    if (!normalizedInput.tickets.length) {
      throw createFieldError("ticket_number", "Select at least one ticket.");
    }

    return runInTransaction("pickupTickets", async (client) => {
      const existingTickets = await Promise.all(
        normalizedInput.tickets.map((ticket) =>
          ticketRepo.loadByTicketNumber(ticket.ticket_number, client),
        ),
      );
      const missingTicket = normalizedInput.tickets.find(
        (_ticket, index) => !existingTickets[index],
      );

      if (missingTicket) {
        throw createFieldError(
          "ticket_number",
          `Ticket #${missingTicket.ticket_number} was not found.`,
        );
      }

      const nonPawnedTicket = existingTickets.find(
        (ticket) => ticket && ticket.status !== "pawned",
      );

      if (nonPawnedTicket?.ticket_number) {
        throw createFieldError(
          "ticket_number",
          `Ticket #${nonPawnedTicket.ticket_number} is not pawned.`,
        );
      }

      const stolenTicket = existingTickets.find((ticket) => ticket?.is_stolen);

      if (stolenTicket?.ticket_number) {
        throw createFieldError(
          "ticket_number",
          `Ticket #${stolenTicket.ticket_number} is marked stolen.`,
        );
      }

      const pickupDatetime = calculation.getCurrentDatetime();
      const authoritativePayments = existingTickets.map((ticket, index) => ({
        ticket_number: normalizedInput.tickets[index].ticket_number,
        pickup_amount_paid: getTicketPickupAmount(ticket!, pickupDatetime),
      }));
      const pickedUpTickets = await ticketRepo.pickup(
        {
          tickets: authoritativePayments,
          pickup_datetime: pickupDatetime,
        },
        client,
      );

      if (pickedUpTickets.length !== authoritativePayments.length) {
        throw createFieldError(
          "ticket_number",
          "Some selected tickets could not be picked up.",
        );
      }

      return pickedUpTickets;
    });
  },

  extendTickets: async (input: ExtendTicketsInput): Promise<Ticket[]> => {
    const normalizedInput = ticketInput.normalizeExtendTickets(input);

    if (!normalizedInput.extensions.length) {
      throw createFieldError("ticket_number", "Select at least one ticket.");
    }

    return runInTransaction("extendTickets", async (client) => {
      const existingTickets = await Promise.all(
        normalizedInput.extensions.map((extension) =>
          ticketRepo.loadByTicketNumber(extension.ticket_number, client),
        ),
      );
      const missingExtension = normalizedInput.extensions.find(
        (_extension, index) => !existingTickets[index],
      );

      if (missingExtension) {
        throw createFieldError(
          "ticket_number",
          `Ticket #${missingExtension.ticket_number} was not found.`,
        );
      }

      const nonPawnedTicket = existingTickets.find(
        (ticket) => ticket && ticket.status !== "pawned",
      );

      if (nonPawnedTicket?.ticket_number) {
        throw createFieldError(
          "ticket_number",
          `Ticket #${nonPawnedTicket.ticket_number} is not pawned.`,
        );
      }

      const stolenTicket = existingTickets.find((ticket) => ticket?.is_stolen);

      if (stolenTicket?.ticket_number) {
        throw createFieldError(
          "ticket_number",
          `Ticket #${stolenTicket.ticket_number} is marked stolen.`,
        );
      }

      const interestedDatetime = calculation.getCurrentDatetime();
      const extendedTickets: Ticket[] = [];
      const ticketByNumber = new Map(
        existingTickets
          .filter((ticket): ticket is Ticket => Boolean(ticket))
          .map((ticket) => [ticket.ticket_number, ticket]),
      );

      for (const extension of normalizedInput.extensions) {
        const extendedTicket = await ticketRepo.extend(
          {
            ticket_number: extension.ticket_number,
            months: extension.months,
            interested_datetime: interestedDatetime,
          },
          client,
        );
        const originalTicket = ticketByNumber.get(extension.ticket_number);
        const amountPaid =
          calculation.getBaseIntAmt(Number(originalTicket?.amount ?? 0)) *
          extension.months;

        await interestPaymentRepo.addInterestPayment(
          {
            ticket_number: extension.ticket_number,
            months_paid: extension.months,
            amount_paid: Number(amountPaid.toFixed(2)),
            payment_datetime: interestedDatetime,
          },
          client,
        );

        extendedTickets.push(extendedTicket);
      }

      return extendedTickets;
    });
  },
};
