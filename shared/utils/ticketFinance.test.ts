import assert from "node:assert/strict";
import test from "node:test";
import type { Ticket } from "../models/ticket.model.ts";
import { getTicketPickupAmount } from "./ticketFinance.ts";

const makeTicket = (overrides: Partial<Ticket> = {}): Ticket =>
  ({
    ticket_number: 100,
    transaction_datetime: new Date("2026-01-01T12:00:00"),
    is_lost: false,
    is_stolen: false,
    location: "AA11",
    description: "TEST",
    due_date: new Date("2026-01-31T12:00:00"),
    amount: 100,
    onetime_fee: 0,
    interest_paid_months: 0,
    partial_payment: 0,
    employee_name: "TEST",
    status: "pawned",
    status_updated_at: new Date("2026-01-01T12:00:00"),
    client_number: 1,
    ...overrides,
  }) as Ticket;

test("deducts an actual interest payment from pickup in the first month", () => {
  const ticket = makeTicket({
    interest_paid_months: 1,
    recorded_interest_amount_paid: 30,
    recorded_interest_months_paid: 1,
  });

  assert.equal(
    getTicketPickupAmount(ticket, new Date("2026-01-20T12:00:00")),
    100,
  );
});

test("keeps the actual payment credit after the ticket amount is corrected", () => {
  const ticket = makeTicket({
    amount: 120,
    interest_paid_months: 1,
    recorded_interest_amount_paid: 30,
    recorded_interest_months_paid: 1,
  });

  assert.equal(
    getTicketPickupAmount(ticket, new Date("2026-01-20T12:00:00")),
    126,
  );
});

test("uses paid-month credit for legacy tickets without payment records", () => {
  const ticket = makeTicket({ amount: 120, interest_paid_months: 1 });

  assert.equal(
    getTicketPickupAmount(ticket, new Date("2026-01-20T12:00:00")),
    120,
  );
});

test("charges normal first-month pickup when no interest was paid", () => {
  const ticket = makeTicket();

  assert.equal(
    getTicketPickupAmount(ticket, new Date("2026-01-20T12:00:00")),
    130,
  );
});
