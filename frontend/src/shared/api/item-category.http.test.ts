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
  assert.deepEqual(calls, ["/reference/item-categories"]);
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

test("item category management uses the reference routes, methods and bodies", async (t) => {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const category = { category_id: 1, category_name: "Tools", is_active: true };
  const subcategory = {
    subcategory_id: 3,
    category_id: 1,
    subcategory_name: "Drills",
    is_active: true,
  };
  t.mock.method(
    globalThis,
    "fetch",
    async (url: URL, init: RequestInit = {}) => {
      const method = init.method ?? "GET";
      calls.push({
        path: url.pathname,
        method,
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      });
      if (method === "GET")
        return Response.json([{ ...category, subcategories: [subcategory] }]);
      if (method === "POST")
        return Response.json(
          url.pathname.includes("subcategories") ? subcategory : category,
        );
      return Response.json(
        url.pathname.includes("subcategories") ? subcategory : category,
      );
    },
  );
  assert.deepEqual(await http.loadAllItemCategoriesHttp(), [
    { ...category, subcategories: [subcategory] },
  ]);
  assert.deepEqual(await http.addItemCategoryHttp("Tools"), category);
  assert.deepEqual(await http.addItemSubcategoryHttp(1, "Drills"), subcategory);
  assert.deepEqual(await http.setItemCategoryActiveHttp(1, false), category);
  assert.deepEqual(
    await http.setItemSubcategoryActiveHttp(3, true),
    subcategory,
  );
  assert.deepEqual(calls, [
    {
      path: "/reference/item-categories/all",
      method: "GET",
      body: undefined,
    },
    {
      path: "/reference/item-categories",
      method: "POST",
      body: { category_name: "Tools" },
    },
    {
      path: "/reference/item-subcategories",
      method: "POST",
      body: { category_id: 1, subcategory_name: "Drills" },
    },
    {
      path: "/reference/item-categories/1",
      method: "PATCH",
      body: { is_active: false },
    },
    {
      path: "/reference/item-subcategories/3",
      method: "PATCH",
      body: { is_active: true },
    },
  ]);
});

test("item category management surfaces server conflict messages", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { message: "That subcategory already exists in this category." },
      { status: 409 },
    ),
  );
  await assert.rejects(
    http.addItemSubcategoryHttp(1, "Drills"),
    /already exists in this category/,
  );
});
