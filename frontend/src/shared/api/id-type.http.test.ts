import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import type { AppApi } from "../../../../shared/api-contracts/appApi.contract.ts";
import * as http from "./client.http.ts";
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
      assert.equal(url.pathname, "/client/reference/id-types");
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
    "/client/reference/id-types/all",
    "/client/reference/id-types",
    "/client/reference/id-types/deactivate",
    "/client/reference/id-types/activate",
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
    assert.equal(url.origin, "http://store-server:3000");
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
  const source = fs
    .readFileSync(new URL("./app.api.ts", import.meta.url), "utf8")
    .replaceAll(
      "import.meta.env.VITE_API_BASE_URL",
      '"http://store-server:3000"',
    );
  const loadTicketsByClient = () => Promise.resolve([]);
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
  assert.deepEqual(await api.client.loadIdTypes(), [item.type]);
  assert.deepEqual(await api.client.loadAllIdTypes(), [item]);
  assert.deepEqual(await api.client.addIdType(item.type), item);
  assert.equal((await api.client.deactivateIdType(item.type)).is_active, false);
  assert.equal((await api.client.activateIdType(item.type)).is_active, true);
  assert.deepEqual(calls, [
    "GET /client/reference/id-types",
    "GET /client/reference/id-types/all",
    "POST /client/reference/id-types",
    "PATCH /client/reference/id-types/deactivate",
    "PATCH /client/reference/id-types/activate",
  ]);
});
