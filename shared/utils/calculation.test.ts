import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculation } from "./calculation.ts";

const utcDate = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

const shortDate = (date: Date) => date.toISOString().slice(0, 10);

const logCase = (
  label: string,
  input: Record<string, unknown>,
  expected: number,
  actual: number,
) => {
  console.log(
    JSON.stringify(
      {
        case: label,
        input,
        expected,
        actual,
      },
      null,
      2,
    ),
  );
};

describe("calculation", () => {
  it("calculates base interest as 30 percent of pawn amount", () => {
    [
      { amount: 100, expected: 30 },
      { amount: 58.9, expected: 17.67 },
    ].forEach(({ amount, expected }) => {
      const actual = calculation.getBaseIntAmt(amount);
      logCase("base interest", { amount }, expected, actual);
      assert.equal(actual, expected);
    });
  });

  it("calculates base pickup as pawn amount plus one interest and one time fee", () => {
    const actual = calculation.getBasePickupAmt(100, 10);
    logCase("base pickup", { amount: 100, oneTimeFee: 10 }, 140, actual);
    assert.equal(actual, 140);
  });

  it("uses early claim amount within 7 days of transaction date", () => {
    const transactionDate = utcDate(2026, 1, 1);
    const asOf = utcDate(2026, 1, 6);
    const actual = calculation.getPaymentPickupAmt(
      100,
      10,
      transactionDate,
      0,
      asOf,
    );

    logCase(
      "early claim",
      {
        amount: 100,
        oneTimeFee: 10,
        transactionDate: shortDate(transactionDate),
        interestPaidMonths: 0,
        asOf: shortDate(asOf),
      },
      120,
      actual,
    );
    assert.equal(actual, 120);
  });

  it("uses early claim amount through the 7th calendar day", () => {
    const transactionDate = utcDate(2026, 5, 8);
    const asOf = utcDate(2026, 5, 15);
    const actual = calculation.getPaymentPickupAmt(
      201,
      0,
      transactionDate,
      0,
      asOf,
    );

    logCase(
      "early claim 7th calendar day",
      {
        amount: 201,
        oneTimeFee: 0,
        transactionDate: shortDate(transactionDate),
        interestPaidMonths: 0,
        asOf: shortDate(asOf),
      },
      221.1,
      actual,
    );
    assert.equal(actual, 221.1);
  });

  it("charges one interest month through the first 30 days after transaction", () => {
    const transactionDate = utcDate(2026, 1, 1);
    const asOf = utcDate(2026, 1, 31);
    const actual = calculation.getPaymentPickupAmt(
      100,
      10,
      transactionDate,
      0,
      asOf,
    );

    logCase(
      "first 30 days",
      {
        amount: 100,
        oneTimeFee: 10,
        transactionDate: shortDate(transactionDate),
        interestPaidMonths: 0,
        asOf: shortDate(asOf),
      },
      140,
      actual,
    );
    assert.equal(actual, 140);
  });

  it("charges a second interest month on day 31", () => {
    const transactionDate = utcDate(2026, 1, 1);
    const asOf = utcDate(2026, 2, 1);
    const actual = calculation.getPaymentPickupAmt(
      100,
      10,
      transactionDate,
      0,
      asOf,
    );

    logCase(
      "day 31",
      {
        amount: 100,
        oneTimeFee: 10,
        transactionDate: shortDate(transactionDate),
        interestPaidMonths: 0,
        asOf: shortDate(asOf),
      },
      170,
      actual,
    );
    assert.equal(actual, 170);
  });

  it("subtracts paid interest months from payment pickup amount", () => {
    const transactionDate = utcDate(2026, 1, 1);
    const asOf = utcDate(2026, 2, 1);
    const actual = calculation.getPaymentPickupAmt(
      100,
      10,
      transactionDate,
      1,
      asOf,
    );

    logCase(
      "paid interest month subtracts from pickup",
      {
        amount: 100,
        oneTimeFee: 10,
        transactionDate: shortDate(transactionDate),
        interestPaidMonths: 1,
        asOf: shortDate(asOf),
      },
      140,
      actual,
    );
    assert.equal(actual, 140);
  });

  it("does not reduce pickup below pawn amount plus one time fee", () => {
    const transactionDate = utcDate(2026, 1, 1);
    const asOf = utcDate(2026, 2, 1);
    const actual = calculation.getPaymentPickupAmt(
      100,
      10,
      transactionDate,
      10,
      asOf,
    );

    logCase(
      "minimum pickup floor",
      {
        amount: 100,
        oneTimeFee: 10,
        transactionDate: shortDate(transactionDate),
        interestPaidMonths: 10,
        asOf: shortDate(asOf),
      },
      110,
      actual,
    );
    assert.equal(actual, 110);
  });

  it("does not require interest before or on the due date", () => {
    const dueDate = utcDate(2026, 2, 1);

    assert.equal(
      calculation.getInterestDue(100, dueDate, utcDate(2026, 1, 31)),
      0,
    );
    assert.equal(
      calculation.getInterestDue(100, dueDate, utcDate(2026, 2, 1)),
      0,
    );
  });

  it("requires one interest payment after the due date and another every 30 days", () => {
    const dueDate = utcDate(2026, 2, 1);

    assert.equal(
      calculation.getInterestDue(100, dueDate, utcDate(2026, 2, 2)),
      30,
    );
    assert.equal(
      calculation.getInterestDue(100, dueDate, utcDate(2026, 3, 4)),
      60,
    );
  });

  it("compares expire eligibility by local calendar date instead of exact time", () => {
    const dueToday = new Date(2026, 4, 15, 1, 0, 0);
    const laterToday = new Date(2026, 4, 15, 23, 0, 0);
    const yesterday = new Date(2026, 4, 14, 23, 0, 0);
    const dueTodayActual = calculation.isBeforeCalendarDate(
      dueToday,
      laterToday,
    );
    const yesterdayActual = calculation.isBeforeCalendarDate(
      yesterday,
      laterToday,
    );

    console.log(
      JSON.stringify(
        {
          case: "expire calendar date comparison",
          input: {
            dueToday: "2026-05-15 01:00",
            laterToday: "2026-05-15 23:00",
            yesterday: "2026-05-14 23:00",
          },
          expected: {
            dueTodayBeforeLaterToday: false,
            yesterdayBeforeLaterToday: true,
          },
          actual: {
            dueTodayBeforeLaterToday: dueTodayActual,
            yesterdayBeforeLaterToday: yesterdayActual,
          },
        },
        null,
        2,
      ),
    );
    assert.equal(dueTodayActual, false);
    assert.equal(yesterdayActual, true);
  });

});
