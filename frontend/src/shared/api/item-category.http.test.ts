import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import type { AppApi } from "../../../../shared/api-contracts/appApi.contract.ts";
import * as http from "./client.http.ts";

const categories = [
  {
    category_id: 1,
    category_name: "Tools",
    subcategory_id: 3,
    subcategory_name: "Drills",
  },
];

test("item categories use HTTP while other item operations keep their implementation", async (t) => {
  const calls: string[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: URL, init: RequestInit = {}) => {
      calls.push(url.pathname);
      assert.equal(url.origin, "http://store-server:3000");
      assert.equal(init.method ?? "GET", "GET");
      return Response.json(categories);
    },
  );
  const source = fs
    .readFileSync(new URL("./app.api.ts", import.meta.url), "utf8")
    .replaceAll(
      "import.meta.env.VITE_API_BASE_URL",
      '"http://store-server:3000/"',
    );
  const loadItemsByTicket = async () => [];
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      window: { appAPI: { item: { loadItemsByTicket } } },
      require: () => http,
    },
  );
  const api = (exports as { getAppApi: () => AppApi }).getAppApi();
  assert.equal(api.item.loadItemsByTicket, loadItemsByTicket);
  assert.deepEqual(await api.item.loadItemCategories(), categories);
  assert.deepEqual(calls, ["/client/reference/item-categories"]);
});

test("item categories return empty lists and propagate HTTP and connection failures", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json([]),
  );
  assert.deepEqual(await http.loadItemCategoriesHttp(), []);
  fetch.mock.mockImplementation(async () =>
    Response.json({ message: "Internal server error" }, { status: 500 }),
  );
  await assert.rejects(http.loadItemCategoriesHttp(), /Internal server error/);
  fetch.mock.mockImplementation(async () => {
    throw new TypeError("fetch failed");
  });
  await assert.rejects(http.loadItemCategoriesHttp());
});
