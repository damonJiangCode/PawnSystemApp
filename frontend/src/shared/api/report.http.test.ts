import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { getAppApi } from "./app.api.ts";
import * as http from "./report.http.ts";

const setWindow = (t: TestContext, appAPI: unknown) => {
  const host = globalThis as { window?: unknown };
  host.window = { appAPI };
  t.after(() => delete host.window);
};

const base = "http://store-server:3000/";
const range = { from_date: "2026-11-01", to_date: "2026-11-02" };

test("loads the daily report with the date range as query parameters", async (t) => {
  const body = {
    ...range,
    tickets: [],
    missing_item_ticket_numbers: [],
    total_tickets: 0,
    total_items: 0,
    total_amount: 0,
  };
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.origin, "http://store-server:3000");
    assert.equal(url.pathname, "/reports/daily");
    assert.equal(url.search, "?from_date=2026-11-01&to_date=2026-11-02");
    return Response.json(body);
  });
  assert.deepEqual(await http.loadDailyReportHttp(range, base), body);
});

test("restores buyback pickup times as Dates", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.pathname, "/reports/buyback");
    return Response.json({
      ...range,
      rows: [
        {
          ticket_number: 20,
          pickup_datetime: "2026-11-02T01:00:00.000Z",
          pickup_amount_paid: 130.1,
          description: "WATCH",
          client_name: "LEE, ANN",
        },
      ],
      total_buyback_price: 130.1,
    });
  });
  const report = await http.loadBuybackReportHttp(range, base);
  assert.deepEqual(
    report.rows[0].pickup_datetime,
    new Date("2026-11-02T01:00:00.000Z"),
  );
  assert.equal(report.total_buyback_price, 130.1);
});

test("restores interest payment times and keeps the records start date", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.pathname, "/reports/interest");
    return Response.json({
      ...range,
      records_start_date: "2026-10-29",
      records_note: null,
      rows: [
        {
          ticket_number: 30,
          months_paid: 2,
          amount_paid: 60.1,
          payment_datetime: "2026-11-02T01:00:00.000Z",
          description: "LAPTOP",
          client_name: "LEE, ANN",
        },
      ],
      total_interest_paid: 60.1,
    });
  });
  const report = await http.loadInterestReportHttp(range, base);
  assert.equal(report.records_start_date, "2026-10-29");
  assert.deepEqual(
    report.rows[0].payment_datetime,
    new Date("2026-11-02T01:00:00.000Z"),
  );
});

test("sends overdue locations as typed and surfaces the server's field error", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.pathname, "/reports/overdue");
    assert.equal(
      url.search,
      "?due_on_or_before=2026-11-10&location_from=RR-A&location_to=RR-Z",
    );
    return Response.json(
      {
        field: "location_to",
        message: "To location must be the same as or later than From location.",
      },
      { status: 400 },
    );
  });
  await assert.rejects(
    http.loadOverdueReportHttp(
      {
        due_on_or_before: "2026-11-10",
        location_from: "RR-A",
        location_to: "RR-Z",
      },
      base,
    ),
    {
      message: "To location must be the same as or later than From location.",
      field: "location_to",
      status: 400,
    },
  );
});

test("getAppApi serves the report domain over HTTP", async (t) => {
  // The preload bridge no longer has a report domain, so this needs only HTTP.
  setWindow(t, {});
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.pathname, "/reports/overdue");
    return Response.json({ tickets: [] });
  });
  const api = getAppApi()!;
  assert.deepEqual(
    await api.report.loadOverdueReport({
      due_on_or_before: "2026-11-10",
      location_from: "AK",
      location_to: "AK",
    }),
    { tickets: [] },
  );
});
