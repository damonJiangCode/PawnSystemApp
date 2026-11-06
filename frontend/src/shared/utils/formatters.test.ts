import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatIsoDate,
  formatShortDate,
  parseMonthDayYear,
} from "./formatters.ts";

describe("renderer date formatters", () => {
  it("converts birthday input to an API calendar date without changing the day", () => {
    assert.equal(parseMonthDayYear("06-01-1988"), "1988-06-01");
    assert.equal(parseMonthDayYear("02-29-2000"), "2000-02-29");
    assert.equal(parseMonthDayYear(" 12-31-1990 "), "1990-12-31");
  });

  it("rejects impossible birthdays and the wrong display format", () => {
    for (const value of [
      "02-29-2001",
      "02-30-2000",
      "13-01-2000",
      "00-01-2000",
      "01-00-2000",
      "6-1-1988",
      "1988-06-01",
      "",
    ]) {
      assert.equal(parseMonthDayYear(value), null, value);
    }
  });
  it("treats date-only strings as local dates", () => {
    assert.equal(formatIsoDate("2026-05-15"), "2026-05-15");
    assert.equal(formatShortDate("2026-05-15"), "May 15, 2026");
  });
});
