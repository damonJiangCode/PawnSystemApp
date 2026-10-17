import assert from "node:assert/strict";
import test from "node:test";
import type { Item } from "../../../../../shared/models/item.model.ts";
import {
  getItemStatusRowClass,
  isItemAddable,
  mergeItems,
} from "./itemSearchWindow.helpers.ts";

const item = (status?: Item["latest_ticket_status"]): Item => ({
  item_number: 1,
  quantity: 1,
  description: "Test item",
  amount: 10,
  latest_ticket_number: 100,
  latest_ticket_status: status,
});

test("pawned rows are red and both expired statuses are yellow", () => {
  assert.equal(getItemStatusRowClass(item("pawned")), "pawned-item-row");
  for (const status of ["pawned_expired", "sold_expired"] as const) {
    assert.equal(getItemStatusRowClass(item(status)), "expired-item-row");
  }
  for (const status of ["pawned_picked_up", "sold", undefined] as const) {
    assert.equal(getItemStatusRowClass(item(status)), "");
  }
});

test("held items and items already on the target ticket cannot be added", () => {
  assert.equal(isItemAddable(item("pawned")), false);
  assert.equal(isItemAddable(item("sold")), false);
  assert.equal(isItemAddable(item("pawned_picked_up"), 100), false);
  assert.equal(isItemAddable({ ...item(), is_loadable: false }), false);
  assert.equal(isItemAddable(item("pawned_picked_up"), 200), true);
});

test("expired items retain the existing eligibility and repeated history items merge once", () => {
  assert.equal(isItemAddable(item("pawned_expired"), 200), true);
  assert.equal(isItemAddable(item("sold_expired"), 200), true);
  assert.equal(
    mergeItems([item()], [item(), { ...item(), item_number: 2 }]).length,
    2,
  );
});
