import type { Ticket } from "../models/ticket.model.ts";
import { calculation } from "./calculation.ts";

export const getTicketPickupAmount = (ticket: Ticket, asOf = new Date()) => {
  const amount = Number(ticket.amount ?? 0);
  const oneTimeFee = Number(ticket.onetime_fee ?? 0);
  const recordedAmount = Math.max(
    0,
    Number(ticket.recorded_interest_amount_paid ?? 0),
  );
  const recordedMonths = Math.max(
    0,
    Number(ticket.recorded_interest_months_paid ?? 0),
  );
  const legacyMonths = Math.max(
    0,
    Number(ticket.interest_paid_months ?? 0) - recordedMonths,
  );
  const legacyCredit = calculation.getBaseIntAmt(amount) * legacyMonths;
  const grossPickup = calculation.getPaymentPickupAmt(
    amount,
    oneTimeFee,
    new Date(ticket.transaction_datetime),
    0,
    asOf,
  );
  const minimumPickup = amount + oneTimeFee;

  return Number(
    Math.max(
      minimumPickup,
      grossPickup - recordedAmount - legacyCredit,
    ).toFixed(2),
  );
};
