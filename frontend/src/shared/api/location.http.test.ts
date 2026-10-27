import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import type { AppApi } from "../../../../shared/api-contracts/appApi.contract.ts";
import * as http from "./client.http.ts";

const baseUrl = "http://store-server:3000/";
const location = { location: "AB12", description: "Shelf A", is_active: true };

test("location HTTP preserves active-code and complete-reference response shapes", async (t) => {
  const paths: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.origin, "http://store-server:3000");
    paths.push(url.pathname);
    return Response.json(url.pathname.endsWith("/all") ? [location] : ["AB12"]);
  });
  assert.deepEqual(await http.loadLocationsHttp(baseUrl), ["AB12"]);
  assert.deepEqual(await http.loadAllLocationsHttp(baseUrl), [location]);
  assert.deepEqual(paths, [
    "/client/reference/locations",
    "/client/reference/locations/all",
  ]);
});

test("location mutations send only editable JSON fields using POST and PATCH", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.origin, "http://store-server:3000");
    assert.equal(
      (init.headers as Record<string, string>)["Content-Type"],
      "application/json",
    );
    if (init.method === "POST") {
      assert.equal(url.pathname, "/client/reference/locations");
      assert.deepEqual(JSON.parse(init.body as string), {
        location: "AB12",
        description: "Shelf A",
      });
      return Response.json(location, { status: 201 });
    }
    assert.equal(init.method, "PATCH");
    assert.ok(
      [
        "/client/reference/locations/deactivate",
        "/client/reference/locations/activate",
      ].includes(url.pathname),
    );
    assert.deepEqual(JSON.parse(init.body as string), { location: "AB12" });
    return Response.json({
      ...location,
      is_active: url.pathname.endsWith("/activate"),
    });
  });
  assert.deepEqual(await http.addLocationHttp(location, baseUrl), location);
  assert.deepEqual(await http.setLocationActiveHttp("AB12", false, baseUrl), {
    ...location,
    is_active: false,
  });
  assert.deepEqual(
    await http.setLocationActiveHttp("AB12", true, baseUrl),
    location,
  );
});

test("location HTTP surfaces server validation/state errors and connection failures", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { message: ["Invalid location", "Invalid description"] },
      { status: 400 },
    ),
  );
  await assert.rejects(
    http.addLocationHttp(location),
    /Invalid location; Invalid description/,
  );
  fetch.mock.mockImplementation(async () =>
    Response.json(
      { message: "That location is already inactive." },
      { status: 409 },
    ),
  );
  await assert.rejects(
    http.setLocationActiveHttp("AB12", false),
    /already inactive/,
  );
  fetch.mock.mockImplementation(async () => {
    throw new Error("Network unavailable");
  });
  await assert.rejects(http.loadLocationsHttp(), /Unable to reach the server/);
});

test("getAppApi routes all five location methods through HTTP and keeps other desktop methods", async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.origin, "http://store-server:3000");
    calls.push(`${init.method ?? "GET"} ${url.pathname}`);
    if (url.pathname.endsWith("/all")) return Response.json([location]);
    if (!init.method) return Response.json(["AB12"]);
    return Response.json(
      init.method === "PATCH"
        ? { ...location, is_active: url.pathname.endsWith("/activate") }
        : location,
    );
  });
  const loadTicketsByClient = () => Promise.resolve([]);
  const source = fs
    .readFileSync(new URL("./app.api.ts", import.meta.url), "utf8")
    .replaceAll(
      "import.meta.env.VITE_API_BASE_URL",
      '"http://store-server:3000"',
    );
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      window: { appAPI: { ticket: { loadTicketsByClient } } },
      require: (name: string) => {
        assert.equal(name, "./client.http.ts");
        return http;
      },
    },
  );
  const api = (exports as { getAppApi: () => AppApi }).getAppApi();
  assert.equal(api.ticket.loadTicketsByClient, loadTicketsByClient);
  assert.deepEqual(await api.ticket.loadLocations(), ["AB12"]);
  assert.deepEqual(await api.ticket.loadAllLocations(), [location]);
  assert.deepEqual(await api.ticket.addLocation(location), location);
  assert.equal((await api.ticket.deactivateLocation("AB12")).is_active, false);
  assert.equal((await api.ticket.activateLocation("AB12")).is_active, true);
  assert.deepEqual(calls, [
    "GET /client/reference/locations",
    "GET /client/reference/locations/all",
    "POST /client/reference/locations",
    "PATCH /client/reference/locations/deactivate",
    "PATCH /client/reference/locations/activate",
  ]);
});
