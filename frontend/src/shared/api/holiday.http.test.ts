import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { getAppApi } from "./app.api.ts";
import * as http from "./reference.http.ts";

const setWindow = (t: TestContext, appAPI: unknown) => {
  const host = globalThis as { window?: unknown };
  host.window = { appAPI };
  t.after(() => delete host.window);
};

const baseUrl = "http://store-server:3000/";
const holiday = { holiday_date: "2026-12-25", name: "Christmas" };

test("holiday HTTP lists date strings without timezone conversion", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.href, "http://store-server:3000/reference/holidays");
    return Response.json([holiday]);
  });
  const result = await http.loadHolidayDatesHttp(baseUrl);
  assert.deepEqual(result, [holiday]);
  assert.equal(typeof result[0].holiday_date, "string");
});

test("holiday HTTP sends POST details and DELETE path with no delete body", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.origin, "http://store-server:3000");
    if (init.method === "POST") {
      assert.equal(url.pathname, "/reference/holidays");
      assert.equal(
        (init.headers as Record<string, string>)["Content-Type"],
        "application/json",
      );
      assert.deepEqual(JSON.parse(init.body as string), holiday);
    } else {
      assert.equal(init.method, "DELETE");
      assert.equal(url.pathname, "/reference/holidays/2026-12-25");
      assert.equal(init.body, undefined);
    }
    return Response.json(holiday);
  });
  assert.deepEqual(await http.addHolidayDateHttp(holiday, baseUrl), holiday);
  assert.deepEqual(
    await http.deleteHolidayDateHttp(holiday.holiday_date, baseUrl),
    holiday,
  );
});

test("holiday HTTP safely encodes a supplied path segment", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.pathname, "/reference/holidays/not%2Fa%3Fdate%23");
    assert.equal(url.search, "");
    assert.equal(url.hash, "");
    return Response.json({ message: "Invalid date" }, { status: 400 });
  });
  await assert.rejects(
    http.deleteHolidayDateHttp("not/a?date#", baseUrl),
    /Invalid date/,
  );
});

test("holiday HTTP preserves validation, duplicate, missing-date and network errors", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { message: ["Invalid date", "Name is required"] },
      { status: 400 },
    ),
  );
  await assert.rejects(
    http.addHolidayDateHttp(holiday),
    /Invalid date; Name is required/,
  );
  fetch.mock.mockImplementation(async () =>
    Response.json(
      { message: "That holiday date has already been added." },
      { status: 409 },
    ),
  );
  await assert.rejects(http.addHolidayDateHttp(holiday), /already been added/);
  fetch.mock.mockImplementation(async () =>
    Response.json(
      { message: "That holiday date was not found." },
      { status: 404 },
    ),
  );
  await assert.rejects(
    http.deleteHolidayDateHttp(holiday.holiday_date),
    /not found/,
  );
  fetch.mock.mockImplementation(async () => {
    throw new Error("Network unavailable");
  });
  await assert.rejects(
    http.loadHolidayDatesHttp(),
    /Unable to reach the server/,
  );
});

test("getAppApi routes all existing holiday methods through HTTP and preserves ticket methods", async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.origin, "http://localhost:3000");
    calls.push(`${init.method ?? "GET"} ${url.pathname}`);
    return Response.json(!init.method ? [holiday] : holiday);
  });
  const loadTicketsByClient = () => Promise.resolve([]);
  setWindow(t, { ticket: { loadTicketsByClient } });
  const api = getAppApi()!;
  assert.equal(api.ticket.loadTicketsByClient, loadTicketsByClient);
  assert.deepEqual(await api.reference.loadHolidayDates(), [holiday]);
  assert.deepEqual(await api.reference.addHolidayDate(holiday), holiday);
  assert.deepEqual(
    await api.reference.deleteHolidayDate(holiday.holiday_date),
    holiday,
  );
  assert.deepEqual(calls, [
    "GET /reference/holidays",
    "POST /reference/holidays",
    "DELETE /reference/holidays/2026-12-25",
  ]);
});
