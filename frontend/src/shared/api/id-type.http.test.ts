import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { getAppApi } from "./app.api.ts";
import * as http from "./reference.http.ts";

const setWindow = (t: TestContext, appAPI: unknown) => {
  const host = globalThis as { window?: unknown };
  host.window = { appAPI };
  t.after(() => delete host.window);
};
const item = { type: "Driver's License", is_active: true };

test("ID type HTTP uses JSON POST/PATCH and returns records with the original label", async (t) => {
  const paths: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.origin, "http://store-server:3000");
    paths.push(url.pathname);
    if (!init.method) return Response.json([item]);
    assert.equal(
      (init.headers as Record<string, string>)["Content-Type"],
      "application/json",
    );
    assert.deepEqual(JSON.parse(init.body as string), { type: item.type });
    if (init.method === "POST") {
      assert.equal(url.pathname, "/reference/id-types");
      return Response.json(item, { status: 201 });
    }
    assert.equal(init.method, "PATCH");
    return Response.json({
      ...item,
      is_active: url.pathname.endsWith("/activate"),
    });
  });
  const base = "http://store-server:3000/";
  assert.deepEqual(await http.loadAllIdTypesHttp(base), [item]);
  assert.deepEqual(await http.addIdTypeHttp(item.type, base), item);
  assert.equal(
    (await http.setIdTypeActiveHttp(item.type, false, base)).is_active,
    false,
  );
  assert.equal(
    (await http.setIdTypeActiveHttp(item.type, true, base)).is_active,
    true,
  );
  assert.deepEqual(paths, [
    "/reference/id-types/all",
    "/reference/id-types",
    "/reference/id-types/deactivate",
    "/reference/id-types/activate",
  ]);
});

test("ID type HTTP forwards server validation/conflict errors and connection failures", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ message: ["type must be a string"] }, { status: 400 }),
  );
  await assert.rejects(http.addIdTypeHttp(""), /type must be a string/);
  fetch.mock.mockImplementation(async () =>
    Response.json({ message: "That ID type already exists." }, { status: 409 }),
  );
  await assert.rejects(http.addIdTypeHttp(item.type), /already exists/);
  fetch.mock.mockImplementation(async () => {
    throw new Error("Network");
  });
  await assert.rejects(http.loadAllIdTypesHttp(), /Unable to reach the server/);
});

test("getAppApi binds all ID type writes/reads to HTTP and preserves desktop methods", async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.origin, "http://localhost:3000");
    calls.push(`${init.method ?? "GET"} ${url.pathname}`);
    if (!init.method)
      return Response.json(
        url.pathname.endsWith("/all") ? [item] : [item.type],
      );
    return Response.json({
      ...item,
      is_active: !url.pathname.endsWith("/deactivate"),
    });
  });
  const expireTicket = () => Promise.resolve({ ok: true } as never);
  setWindow(t, { ticket: { expireTicket } });
  const api = getAppApi()!;
  assert.equal(api.ticket.expireTicket, expireTicket);
  assert.deepEqual(await api.reference.loadIdTypes(), [item.type]);
  assert.deepEqual(await api.reference.loadAllIdTypes(), [item]);
  assert.deepEqual(await api.reference.addIdType(item.type), item);
  assert.equal(
    (await api.reference.deactivateIdType(item.type)).is_active,
    false,
  );
  assert.equal((await api.reference.activateIdType(item.type)).is_active, true);
  assert.deepEqual(calls, [
    "GET /reference/id-types",
    "GET /reference/id-types/all",
    "POST /reference/id-types",
    "PATCH /reference/id-types/deactivate",
    "PATCH /reference/id-types/activate",
  ]);
});
