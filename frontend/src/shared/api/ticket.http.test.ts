import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { getAppApi } from "./app.api.ts";
import * as http from "./ticket.http.ts";

const setWindow = (t: TestContext, appAPI: unknown) => {
  const host = globalThis as { window?: unknown };
  host.window = { appAPI };
  t.after(() => delete host.window);
};

const base = "http://store-server:3000/";
const ticketJson = {
  ticket_number: 123,
  transaction_datetime: "2026-05-12T05:30:00.000Z",
  is_lost: false,
  is_stolen: false,
  location: "A1",
  description: "RING",
  due_date: "2026-06-11T05:30:00.000Z",
  amount: 100,
  onetime_fee: 5,
  interest_paid_months: 0,
  recorded_interest_amount_paid: 0,
  recorded_interest_months_paid: 0,
  partial_payment: 0,
  partial_payment_datetime: null,
  interested_datetime: null,
  employee_name: "ANNA",
  pickup_datetime: "2026-05-13T18:00:00.000Z",
  pickup_amount_paid: 110,
  expire_date: null,
  status: "pawned_picked_up",
  status_updated_at: "2026-05-13T18:00:00.000Z",
  client_number: 7,
  earliest_pickup_date: "2026-05-14",
  pickup_allowed: false,
};
const clientJson = {
  client_number: 7,
  first_name: "ANN",
  date_of_birth: "1990-01-02T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  image_updated_at: null,
  identifications: [],
};

test("lists a client's tickets with dates restored and the server's pickup hold", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.origin, "http://store-server:3000");
    assert.equal(url.pathname, "/tickets");
    assert.equal(url.search, "?client_number=7");
    return Response.json([ticketJson]);
  });
  const [ticket] = await http.loadTicketsByClientHttp(7, base);
  assert.ok(ticket.transaction_datetime instanceof Date);
  assert.ok(ticket.pickup_datetime instanceof Date);
  assert.equal(ticket.partial_payment_datetime, undefined);
  assert.equal(ticket.expire_date, undefined);
  assert.equal(ticket.pickup_amount_paid, 110);
  assert.equal(ticket.earliest_pickup_date, "2026-05-14");
  assert.equal(ticket.pickup_allowed, false);
});

test("searches by number and returns the ticket with its client", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.pathname, "/tickets/123");
    return Response.json({ ticket: ticketJson, client: clientJson });
  });
  const result = await http.searchTicketByNumberHttp(123, base);
  assert.equal(result?.ticket.ticket_number, 123);
  assert.ok(result?.client.date_of_birth instanceof Date);
});

test("a missing ticket is null, other failures still throw", async (t) => {
  let status = 404;
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { field: "ticket_number", message: "No ticket was found." },
      { status },
    ),
  );
  assert.equal(await http.searchTicketByNumberHttp(999, base), null);
  status = 500;
  await assert.rejects(http.searchTicketByNumberHttp(999, base), {
    message: "No ticket was found.",
    status: 500,
  });
});

test("getAppApi serves ticket lookups over HTTP and keeps desktop ticket actions", async (t) => {
  const expireTicket = () => Promise.resolve({ ok: true } as never);
  setWindow(t, {
    ticket: {
      expireTicket,
      loadTicketsByClient: () => {
        throw new Error("IPC must not be used");
      },
    },
  });
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.pathname, "/tickets");
    return Response.json([]);
  });
  const api = getAppApi()!;
  assert.equal(api.ticket.expireTicket, expireTicket);
  assert.deepEqual(await api.ticket.loadTicketsByClient(7), []);
});
