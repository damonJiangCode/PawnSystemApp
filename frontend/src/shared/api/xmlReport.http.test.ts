import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { getAppApi } from "./app.api.ts";
import * as http from "./xmlReport.http.ts";

const setWindow = (t: TestContext, appAPI: unknown) => {
  const host = globalThis as { window?: unknown };
  host.window = { appAPI };
  t.after(() => delete host.window);
};

const base = "http://store-server:3000/";
const range = { from_date: "2026-11-01", to_date: "2026-11-02" };

test("checks the LeadsOnline connection with a longer timeout", async (t) => {
  const body = {
    environment: "sandbox",
    connected: true,
    error_code: 0,
    message: "Connected to LeadsOnline successfully.",
  };
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(
      url.toString(),
      "http://store-server:3000/xml-reports/connection",
    );
    assert.ok(init.signal instanceof AbortSignal);
    return Response.json(body);
  });
  assert.deepEqual(await http.checkXmlReportConnectionHttp(base), body);
});

test("loads the preview with the date range as query parameters", async (t) => {
  const body = {
    ...range,
    tickets: [],
    total_tickets: 0,
    valid_tickets: 0,
    invalid_tickets: 0,
  };
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.pathname, "/xml-reports/preview");
    assert.equal(url.search, "?from_date=2026-11-01&to_date=2026-11-02");
    return Response.json(body);
  });
  assert.deepEqual(await http.loadXmlReportPreviewHttp(range, base), body);
});

test("posts the submit range as JSON and passes on a 409", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.pathname, "/xml-reports/submit");
    assert.equal(init.method, "POST");
    assert.deepEqual(JSON.parse(String(init.body)), range);
    return Response.json(
      {
        statusCode: 409,
        message:
          "A LeadsOnline submission is already running. Wait for it to finish.",
      },
      { status: 409 },
    );
  });
  await assert.rejects(() => http.submitXmlReportHttp(range, base), {
    message:
      "A LeadsOnline submission is already running. Wait for it to finish.",
    status: 409,
  });
});

test("getAppApi serves XML reports over HTTP, not the preload bridge", async (t) => {
  setWindow(t, {
    xmlReport: {
      checkConnection: () => {
        throw new Error("IPC must not be used");
      },
    },
  });
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.pathname, "/xml-reports/connection");
    return Response.json({ connected: true });
  });
  assert.deepEqual(await getAppApi()!.xmlReport.checkConnection(), {
    connected: true,
  });
});
