import assert from "node:assert/strict";
import test from "node:test";
import type { Ticket } from "../../../../shared/models/ticket.model.ts";
import { canRepawnTicket, sortHistoryTickets } from "./history.helpers.ts";

const createHistoryTicket = (
  ticketNumber: number,
  input: Partial<Ticket>,
): Ticket => ({
  ticket_number: ticketNumber,
  transaction_datetime: new Date("2025-01-01T12:00:00Z"),
  is_lost: false,
  is_stolen: false,
  location: "AA1",
  description: "TEST",
  due_date: new Date("2025-02-01T12:00:00Z"),
  amount: 100,
  onetime_fee: 0,
  interest_paid_months: 0,
  partial_payment: 0,
  employee_name: "TEST",
  status: "pawned_expired",
  status_updated_at: new Date("2026-01-01T12:00:00Z"),
  client_number: 1,
  ...input,
});

test("sorts history tickets by status activity instead of ticket creation", () => {
  const expiredYesterday = createHistoryTicket(980000, {
    transaction_datetime: new Date("2026-08-01T12:00:00Z"),
    expire_date: new Date("2026-09-07T12:00:00Z"),
    status_updated_at: new Date("2026-09-07T12:00:00Z"),
  });
  const oldTicketPickedUpToday = createHistoryTicket(900000, {
    transaction_datetime: new Date("2025-01-01T12:00:00Z"),
    pickup_datetime: new Date("2026-09-08T12:00:00Z"),
    status: "pawned_picked_up",
    status_updated_at: new Date("2026-09-08T12:00:00Z"),
  });

  assert.deepEqual(
    sortHistoryTickets([oldTicketPickedUpToday, expiredYesterday]).map(
      (ticket) => ticket.ticket_number,
    ),
    [980000, 900000],
  );
});

test("uses the ticket number when history activity times match", () => {
  const activityTime = new Date("2026-09-08T12:00:00Z");
  const higherTicket = createHistoryTicket(980001, {
    status_updated_at: activityTime,
  });
  const lowerTicket = createHistoryTicket(980000, {
    status_updated_at: activityTime,
  });

  assert.deepEqual(
    sortHistoryTickets([higherTicket, lowerTicket]).map(
      (ticket) => ticket.ticket_number,
    ),
    [980000, 980001],
  );
});

test("allows repawn only for tickets from the pawn flow", () => {
  assert.equal(
    canRepawnTicket(createHistoryTicket(1, { status: "pawned_expired" })),
    true,
  );
  assert.equal(
    canRepawnTicket(createHistoryTicket(2, { status: "pawned_picked_up" })),
    true,
  );
  assert.equal(
    canRepawnTicket(createHistoryTicket(3, { status: "sold_expired" })),
    false,
  );
});
