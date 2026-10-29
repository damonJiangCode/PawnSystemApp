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
  assert.deepEqual(paths, ["/reference/locations", "/reference/locations/all"]);
});

test("location mutations send only editable JSON fields using POST and PATCH", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.origin, "http://store-server:3000");
    assert.equal(
      (init.headers as Record<string, string>)["Content-Type"],
      "application/json",
    );
    if (init.method === "POST") {
      assert.equal(url.pathname, "/reference/locations");
      assert.deepEqual(JSON.parse(init.body as string), {
        location: "AB12",
        description: "Shelf A",
      });
      return Response.json(location, { status: 201 });
    }
    assert.equal(init.method, "PATCH");
    assert.ok(
      [
        "/reference/locations/deactivate",
        "/reference/locations/activate",
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
    assert.equal(url.origin, "http://localhost:3000");
    calls.push(`${init.method ?? "GET"} ${url.pathname}`);
    if (url.pathname.endsWith("/all")) return Response.json([location]);
    if (!init.method) return Response.json(["AB12"]);
    return Response.json(
      init.method === "PATCH"
        ? { ...location, is_active: url.pathname.endsWith("/activate") }
        : location,
    );
  });
  const expireTicket = () => Promise.resolve({ ok: true } as never);
  setWindow(t, { ticket: { expireTicket } });
  const api = getAppApi()!;
  assert.equal(api.ticket.expireTicket, expireTicket);
  assert.deepEqual(await api.reference.loadLocations(), ["AB12"]);
  assert.deepEqual(await api.reference.loadAllLocations(), [location]);
  assert.deepEqual(await api.reference.addLocation(location), location);
  assert.equal(
    (await api.reference.deactivateLocation("AB12")).is_active,
    false,
  );
  assert.equal((await api.reference.activateLocation("AB12")).is_active, true);
  assert.deepEqual(calls, [
    "GET /reference/locations",
    "GET /reference/locations/all",
    "POST /reference/locations",
    "PATCH /reference/locations/deactivate",
    "PATCH /reference/locations/activate",
  ]);
});
