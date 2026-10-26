import type { Ticket } from "../../../../../shared/models/ticket.model";
import { calculation } from "../../../../../shared/utils/calculation";
import { getTicketPickupAmount } from "../../../../../shared/utils/ticketFinance";
import type {
  PaymentMode,
  PaymentRowsByMode,
  PaymentSelectionByMode,
  PaymentTicketRow,
} from "./payment.types";

export const createEmptyRowsByMode = (): PaymentRowsByMode => ({
  pickup: [],
  extension: [],
});

export const createEmptySelectionByMode = (): PaymentSelectionByMode => ({
  pickup: [],
  extension: [],
});

export const getOppositeMode = (mode: PaymentMode): PaymentMode =>
  mode === "pickup" ? "extension" : "pickup";

export const addThirtyDayPeriods = (date: Date, periods: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + periods * 30);
  return nextDate;
};

export const mapTicketToPaymentRow = (
  ticket: Ticket,
  holidayDateKeys: string[],
): PaymentTicketRow | null => {
  if (!ticket.ticket_number) {
    return null;
  }

  const pawnAmount = Number(ticket.amount ?? 0);
  const baseExtensionAmount = calculation.getBaseIntAmt(pawnAmount);
  const earliestPickupDate = calculation.getEarliestPickupDatetime(
    ticket.transaction_datetime,
    holidayDateKeys,
  );

  return {
    id: ticket.ticket_number,
    ticketNumber: ticket.ticket_number,
    status: ticket.status,
    isLost: Boolean(ticket.is_lost),
    location: ticket.location,
    description: ticket.description,
    dueDate: ticket.due_date,
    sourceDueDate: ticket.due_date,
    isPickupAllowed: calculation.isPickupAllowed(
      ticket.transaction_datetime,
      holidayDateKeys,
    ),
    earliestPickupDate,
    pickupAmount: getTicketPickupAmount(ticket),
    baseExtensionAmount,
    extensionAmount: baseExtensionAmount,
    extensionMonths: 1,
  };
};
