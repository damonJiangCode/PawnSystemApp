import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { getAppApi } from "./app.api.ts";
import * as http from "./item.http.ts";

const setWindow = (t: TestContext, appAPI: unknown) => {
  const host = globalThis as { window?: unknown };
  host.window = { appAPI };
  t.after(() => delete host.window);
};

const base = "http://store-server:3000/";
const itemJson = {
  item_number: 40,
  quantity: 1,
  subcategory_id: 3,
  category_name: "JEWELLERY",
  subcategory_name: "RING",
  description: "GOLD RING",
  brand_name: "",
  model_number: "",
  serial_number: "SN1",
  amount: 120.5,
  latest_ticket_number: 10,
  latest_ticket_status: "pawned",
  is_loadable: false,
  image_path: "images/items/a.png",
};

test("loads a ticket's items from the ticket sub-resource", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.origin, "http://store-server:3000");
    assert.equal(url.pathname, "/tickets/10/items");
    return Response.json([itemJson]);
  });
  assert.deepEqual(await http.loadItemsByTicketHttp(10, base), [itemJson]);
});

test("getAppApi loads items over HTTP and keeps the other item methods on IPC", async (t) => {
  const searchItems = () => Promise.resolve([]);
  setWindow(t, {
    item: {
      searchItems,
      loadItemsByTicket: () => {
        throw new Error("IPC must not be used");
      },
    },
  });
  t.mock.method(globalThis, "fetch", async () => Response.json([]));
  const api = getAppApi()!;
  assert.equal(api.item.searchItems, searchItems);
  assert.deepEqual(await api.item.loadItemsByTicket(10), []);
});
