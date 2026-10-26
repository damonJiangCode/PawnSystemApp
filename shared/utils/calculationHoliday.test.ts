import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { calculation } from "./calculation.ts";
import {
  type JsonTestCase,
  writeJsonTestReport,
} from "../test/jsonTestReport.ts";

const utcDate = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

const shortDate = (date: Date) => date.toISOString().slice(0, 10);

const cases: JsonTestCase[] = [];

const recordCase = (testCase: JsonTestCase) => {
  cases.push(testCase);
  console.log(JSON.stringify(testCase, null, 2));
};

describe("holiday pickup hold calculation", () => {
  after(() => {
    writeJsonTestReport("calculation-holiday-report.json", cases);
  });

  it("allows pickup on Thursday for a Monday pawn with no holidays", () => {
    const transactionDate = utcDate(2026, 5, 11);
    const actual = calculation.getEarliestPickupDatetime(transactionDate, []);
    const expectedDate = "2026-05-14";

    recordCase({
      case: "monday pawn no holidays",
      input: {
        transactionDate: shortDate(transactionDate),
        holidays: [],
        holdBusinessDays: 2,
      },
      expected: {
        earliestPickupDate: expectedDate,
      },
      actual: {
        earliestPickupDate: shortDate(actual),
      },
    });
    assert.equal(shortDate(actual), expectedDate);
  });

  it("skips a holiday inside the hold period", () => {
    const transactionDate = utcDate(2026, 5, 11);
    const holidays = ["2026-05-13"];
    const actual = calculation.getEarliestPickupDatetime(
      transactionDate,
      holidays,
    );
    const expectedDate = "2026-05-15";

    recordCase({
      case: "monday pawn with wednesday holiday",
      input: {
        transactionDate: shortDate(transactionDate),
        holidays,
        holdBusinessDays: 2,
      },
      expected: {
        earliestPickupDate: expectedDate,
      },
      actual: {
        earliestPickupDate: shortDate(actual),
      },
    });
    assert.equal(shortDate(actual), expectedDate);
  });

  it("skips weekends inside the hold period", () => {
    const transactionDate = utcDate(2026, 5, 15);
    const actual = calculation.getEarliestPickupDatetime(transactionDate, []);
    const expectedDate = "2026-05-20";

    recordCase({
      case: "friday pawn skips weekend",
      input: {
        transactionDate: shortDate(transactionDate),
        holidays: [],
        holdBusinessDays: 2,
      },
      expected: {
        earliestPickupDate: expectedDate,
      },
      actual: {
        earliestPickupDate: shortDate(actual),
      },
    });
    assert.equal(shortDate(actual), expectedDate);
  });

  it("skips a holiday immediately after pawn date", () => {
    const transactionDate = utcDate(2026, 5, 11);
    const holidays = ["2026-05-12"];
    const actual = calculation.getEarliestPickupDatetime(
      transactionDate,
      holidays,
    );
    const expectedDate = "2026-05-15";

    recordCase({
      case: "monday pawn with tuesday holiday",
      input: {
        transactionDate: shortDate(transactionDate),
        holidays,
        holdBusinessDays: 2,
      },
      expected: {
        earliestPickupDate: expectedDate,
      },
      actual: {
        earliestPickupDate: shortDate(actual),
      },
    });
    assert.equal(shortDate(actual), expectedDate);
  });

  it("blocks pickup before earliest pickup date and allows it on that date", () => {
    const transactionDate = utcDate(2026, 5, 11);
    const beforePickup = utcDate(2026, 5, 13);
    const earliestPickup = utcDate(2026, 5, 14);
    const beforeActual = calculation.isPickupAllowed(
      transactionDate,
      [],
      beforePickup,
    );
    const earliestActual = calculation.isPickupAllowed(
      transactionDate,
      [],
      earliestPickup,
    );

    recordCase({
      case: "pickup allowed boundary",
      input: {
        transactionDate: shortDate(transactionDate),
        holidays: [],
        beforePickupDate: shortDate(beforePickup),
        earliestPickupDate: shortDate(earliestPickup),
        holdBusinessDays: 2,
      },
      expected: {
        beforePickupAllowed: false,
        earliestPickupAllowed: true,
      },
      actual: {
        beforePickupAllowed: beforeActual,
        earliestPickupAllowed: earliestActual,
      },
    });
    assert.equal(beforeActual, false);
    assert.equal(earliestActual, true);
  });
});
