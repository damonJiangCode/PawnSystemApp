import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calendarDate,
  dateParts,
  pastedDate,
  segmentDigits,
} from "./dateInput.ts";

describe("segmented date input", () => {
  it("keeps client and report display orders separate from the API date", () => {
    assert.deepEqual(dateParts("1988-06-01", "MM-DD-YYYY"), [
      "06",
      "01",
      "1988",
    ]);
    assert.deepEqual(dateParts("1988-06-01", "YYYY-MM-DD"), [
      "1988",
      "06",
      "01",
    ]);
    assert.equal(
      calendarDate(["06", "01", "1988"], "MM-DD-YYYY"),
      "1988-06-01",
    );
    assert.equal(
      calendarDate(["1988", "06", "01"], "YYYY-MM-DD"),
      "1988-06-01",
    );
  });
  it("accepts eight-digit paste in either display order", () => {
    assert.deepEqual(pastedDate("06011988", "MM-DD-YYYY"), [
      "06",
      "01",
      "1988",
    ]);
    assert.deepEqual(pastedDate("19880601", "YYYY-MM-DD"), [
      "1988",
      "06",
      "01",
    ]);
    assert.deepEqual(pastedDate("06-01-1988", "MM-DD-YYYY"), [
      "06",
      "01",
      "1988",
    ]);
    assert.deepEqual(pastedDate("1988-06-01", "YYYY-MM-DD"), [
      "1988",
      "06",
      "01",
    ]);
    assert.equal(pastedDate("0601198800", "MM-DD-YYYY"), null);
  });
  it("caps year at four digits and other segments at two", () => {
    assert.equal(segmentDigits("202666", 4), "2026");
    assert.equal(segmentDigits("123", 2), "12");
    assert.equal(segmentDigits("20ab26", 4), "2026");
  });
  it("clears incomplete or impossible dates instead of retaining a previous value", () => {
    for (const parts of [
      ["", "", ""],
      ["02", "29", "2001"],
      ["13", "01", "2000"],
      ["01", "01", "0000"],
      ["01", "01", "202666"],
      ["01", "01", "202"],
      ["04", "31", "2026"],
    ]) {
      assert.equal(calendarDate(parts, "MM-DD-YYYY"), "");
    }
    assert.equal(
      calendarDate(["02", "29", "2000"], "MM-DD-YYYY"),
      "2000-02-29",
    );
    assert.equal(
      calendarDate(["12", "31", "9999"], "MM-DD-YYYY"),
      "9999-12-31",
    );
    assert.equal(
      calendarDate(["01", "01", "0001"], "MM-DD-YYYY"),
      "0001-01-01",
    );
  });
});
