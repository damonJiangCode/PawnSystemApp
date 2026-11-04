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

test("searches with only the filled-in filters and returns the truncated flag", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.pathname, "/items/search");
    assert.equal(
      url.search,
      "?category_id=2&brand_name=APPLE&serial_number=SN",
    );
    return Response.json({ items: [itemJson], truncated: true });
  });
  assert.deepEqual(
    await http.searchItemsHttp(
      {
        client_number: undefined,
        category_id: 2,
        subcategory_id: undefined,
        brand_name: " APPLE ",
        model_number: "",
        serial_number: "SN",
      },
      base,
    ),
    { items: [itemJson], truncated: true },
  );
});

test("search shows the server's validation message", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { field: "item_number", message: "Enter a valid item number." },
      { status: 400 },
    ),
  );
  await assert.rejects(
    http.searchItemsHttp({ item_number: 1.5 }, base),
    /Enter a valid item number\./,
  );
});

test("creates an item on its ticket with the photo in the body", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.pathname, "/tickets/10/items");
    assert.equal(init.method, "POST");
    assert.deepEqual(JSON.parse(String(init.body)), {
      quantity: 1,
      subcategory_id: 3,
      description: "GOLD RING",
      brand_name: "",
      model_number: "",
      serial_number: "SN1",
      amount: 120.5,
      photo: { fileName: "item_pending_1.png", base64: "iVBORw0KGgo=" },
    });
    return Response.json(itemJson, { status: 201 });
  });
  const created = await http.createItemHttp(
    {
      ticket_number: 10,
      quantity: 1,
      subcategory_id: 3,
      description: "GOLD RING",
      brand_name: "",
      model_number: "",
      serial_number: "SN1",
      amount: 120.5,
      photo: { fileName: "item_pending_1.png", base64: "iVBORw0KGgo=" },
    },
    base,
  );
  assert.deepEqual(created, itemJson);
});

test("updates an item through its ticket; without a photo none is sent", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.pathname, "/tickets/10/items/40");
    assert.equal(init.method, "PATCH");
    assert.deepEqual(JSON.parse(String(init.body)), {
      quantity: 2,
      subcategory_id: 3,
      description: "GOLD RING",
      brand_name: "",
      model_number: "",
      serial_number: "SN1",
      amount: 99.5,
    });
    return Response.json(itemJson);
  });
  const updated = await http.updateItemHttp(
    {
      ticket_number: 10,
      item_number: 40,
      quantity: 2,
      subcategory_id: 3,
      description: "GOLD RING",
      brand_name: "",
      model_number: "",
      serial_number: "SN1",
      amount: 99.5,
      photo: undefined,
    },
    base,
  );
  assert.deepEqual(updated, itemJson);
});

test("deletes an item from its ticket and accepts the empty 204", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.pathname, "/tickets/10/items/40");
    assert.equal(init.method, "DELETE");
    return new Response(null, { status: 204 });
  });
  assert.equal(await http.deleteItemHttp(10, 40, base), undefined);
});

test("delete shows the server's conflict message", async (t) => {
  const message = "Items can only be changed on pawned or sold tickets.";
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ field: "ticket_number", message }, { status: 409 }),
  );
  await assert.rejects(http.deleteItemHttp(10, 40, base), { message });
});

test("getAppApi serves everything but linking over HTTP and keeps linking on IPC", async (t) => {
  const linkItemsToTicket = () => Promise.resolve([]);
  const ipcMustNotBeUsed = () => {
    throw new Error("IPC must not be used");
  };
  setWindow(t, {
    item: {
      linkItemsToTicket,
      createItem: ipcMustNotBeUsed,
      updateItem: ipcMustNotBeUsed,
      deleteItem: ipcMustNotBeUsed,
      loadItemsByTicket: ipcMustNotBeUsed,
      searchItems: ipcMustNotBeUsed,
    },
  });
  t.mock.method(globalThis, "fetch", async (url: URL) =>
    Response.json(
      url.pathname === "/items/search" ? { items: [], truncated: false } : [],
    ),
  );
  const api = getAppApi()!;
  assert.equal(api.item.linkItemsToTicket, linkItemsToTicket);
  assert.notEqual(api.item.deleteItem, ipcMustNotBeUsed);
  assert.notEqual(api.item.createItem, ipcMustNotBeUsed);
  assert.notEqual(api.item.updateItem, ipcMustNotBeUsed);
  assert.deepEqual(await api.item.loadItemsByTicket(10), []);
  assert.deepEqual(await api.item.searchItems({ client_number: 7 }), {
    items: [],
    truncated: false,
  });
});
