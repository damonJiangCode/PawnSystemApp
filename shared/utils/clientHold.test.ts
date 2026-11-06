import assert from "node:assert/strict";
import test from "node:test";
import { normalizeClientHoldDate } from "./clientHold.ts";

test("hold dates retain their calendar day without timezone conversion", () => {
  assert.equal(normalizeClientHoldDate("2026-10-23"), "2026-10-23");
  assert.equal(normalizeClientHoldDate("2024-02-29"), "2024-02-29");
});
test("clearing a hold is explicit and supported", () => {
  assert.equal(normalizeClientHoldDate(null), null);
  assert.equal(normalizeClientHoldDate(""), null);
});
test("invalid calendar dates and timestamp inputs are rejected", () => {
  for (const value of [
    "2026-02-29",
    "2026-02-30",
    "2026-13-01",
    "2026-00-01",
    "2026-10-32",
    "10/23/2026",
    "2026-10-23T00:00:00Z",
    "0000-01-01",
  ]) {
    assert.throws(() => normalizeClientHoldDate(value), /valid hold date/);
  }
});
