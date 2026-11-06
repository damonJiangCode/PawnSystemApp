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
  assert.equal(ticket.interested_datetime, undefined);
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

test("getAppApi serves every ticket method over HTTP and keeps desktop reports", async (t) => {
  const loadDailyReport = () => Promise.resolve({} as never);
  setWindow(t, {
    report: { loadDailyReport },
    ticket: {
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
  assert.equal(api.report.loadDailyReport, loadDailyReport);
  assert.deepEqual(await api.ticket.loadTicketsByClient(7), []);
});

const pawnInput = {
  client_number: 7,
  description: "RING",
  location: "A1",
  amount: 100.5,
  onetime_fee: 5,
  employee_password: "1234",
};

test("pawn and sell POST only the accepted fields and return the ticket", async (t) => {
  const bodies: Record<string, unknown> = {};
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(init.method, "POST");
    bodies[url.pathname] = JSON.parse(init.body as string);
    return Response.json(ticketJson, { status: 201 });
  });
  const pawned = await http.createPawnTicketHttp(
    { ...pawnInput, ticket_number: 1, status: "sold" } as never,
    base,
  );
  const { onetime_fee: _fee, ...sellInput } = pawnInput;
  await http.createSellTicketHttp(sellInput, base);
  assert.ok(pawned.transaction_datetime instanceof Date);
  assert.deepEqual(bodies["/tickets/pawn"], pawnInput);
  assert.deepEqual(bodies["/tickets/sell"], sellInput);
});

test("pawn errors keep the server field and status for the dialog", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { field: "location", message: "Select a valid location from the list." },
      { status: 400 },
    ),
  );
  await assert.rejects(http.createPawnTicketHttp(pawnInput, base), {
    field: "location",
    status: 400,
    message: "Select a valid location from the list.",
  });
});

test("each ticket action calls its route with only the accepted body", async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    calls.push(
      `${init.method ?? "GET"} ${url.pathname} ${init.body ?? ""}`.trim(),
    );
    if (url.pathname.endsWith("/reverse"))
      return Response.json({
        ticket: ticketJson,
        client: clientJson,
        previous_status: "pawned_picked_up",
      });
    if (url.pathname.endsWith("/transfer-preview"))
      return Response.json({ ticket_number: 123 });
    if (
      url.pathname === "/tickets/pickups" ||
      url.pathname === "/tickets/extensions"
    )
      return Response.json([ticketJson]);
    return Response.json(ticketJson);
  });
  const api = http.createTicketHttpApi(base);
  const edit = { ...pawnInput, ticket_number: 123, is_lost: true };
  await api.updateTicket(edit);
  await api.convertTicket({ ...edit, target_status: "sold" });
  await api.loadTransferTicketPreview(123);
  await api.transferTicket({ ticket_number: 123, client_number: 8 });
  await api.pickupTickets({
    tickets: [{ ticket_number: 123, pickup_amount_paid: 115 }],
  });
  await api.extendTickets({
    extensions: [{ ticket_number: 123, months: 2, amount: 60 }],
  });
  await api.expireTicket({ ticket_number: 123 });
  await api.markTicketStolen({ ticket_number: 123, employee_password: "1234" });
  await api.unmarkTicketStolen(123);
  const reversed = await api.reverseTicket({
    ticket_number: 123,
    employee_password: "1234",
  });
  assert.ok(reversed.ticket.transaction_datetime instanceof Date);
  assert.equal(reversed.previous_status, "pawned_picked_up");
  assert.deepEqual(calls, [
    'PATCH /tickets/123 {"description":"RING","location":"A1","amount":100.5,"onetime_fee":5,"is_lost":true,"employee_password":"1234"}',
    'POST /tickets/123/convert {"target_status":"sold","description":"RING","location":"A1","amount":100.5,"onetime_fee":5,"employee_password":"1234"}',
    "GET /tickets/123/transfer-preview",
    'POST /tickets/123/transfer {"client_number":8}',
    'POST /tickets/pickups {"tickets":[{"ticket_number":123,"amount":115}]}',
    'POST /tickets/extensions {"extensions":[{"ticket_number":123,"months":2,"amount":60}]}',
    "POST /tickets/123/expire",
    'PATCH /tickets/123/stolen {"is_stolen":true,"employee_password":"1234"}',
    'PATCH /tickets/123/stolen {"is_stolen":false}',
    'POST /tickets/123/reverse {"employee_password":"1234"}',
  ]);
});

test("a missing transfer ticket is null; a conflict keeps its status", async (t) => {
  let status = 404;
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ message: "No ticket" }, { status }),
  );
  assert.equal(await http.loadTransferTicketPreviewHttp(5, base), null);
  status = 409;
  await assert.rejects(http.loadTransferTicketPreviewHttp(5, base), {
    status: 409,
  });
});
