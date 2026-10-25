import assert from "node:assert/strict";
import test from "node:test";
import { formatClientIdType, formatClientOption } from "./clientDisplay.ts";
import { createClientProfileDisplay } from "../components/profile/clientProfileDisplay.ts";

test("known options display consistently without rewriting custom option labels", () => {
  assert.equal(formatClientOption("MALE"), "Male");
  assert.equal(formatClientOption("BROWN"), "Brown");
  assert.equal(formatClientOption(" blonde "), "Blonde");
  assert.equal(formatClientOption("CUSTOM RGB"), "CUSTOM RGB");
  assert.equal(formatClientOption(null), "—");
});

test("ID labels preserve proper names and acronyms, including custom types", () => {
  assert.equal(formatClientIdType("Driver's License"), "Driver’s license");
  assert.equal(
    formatClientIdType("Social Insurance Number"),
    "Social Insurance Number",
  );
  assert.equal(formatClientIdType("PROVINCIAL ID"), "Provincial ID");
  assert.equal(formatClientIdType("Custom ABC card"), "Custom ABC card");
});

test("profile formatting preserves literal identifiers, address and note text", () => {
  const display = createClientProfileDisplay(false);
  for (const value of [
    "00Ab123",
    "2026-11-15",
    "O’Neil",
    "224 AVE S SOUTH",
    "PAID $40 (CHA0)",
  ]) {
    assert.equal(display.text(value), value);
  }
  assert.equal(display.option("MALE"), "Male");
  assert.equal(display.uppercase("s7k 1a1"), "S7K 1A1");
  assert.equal(display.text(""), "—");
  assert.equal(display.count(0), "0");
  assert.equal(display.measurement(undefined, "cm"), "—");
  assert.equal(createClientProfileDisplay(true).option("BROWN"), "—");
});
