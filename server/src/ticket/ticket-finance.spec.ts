import { afterAll, describe, expect, it } from 'vitest';
import { calculation } from '../../../shared/utils/calculation.ts';
import { getTicketPickupAmount as sharedTicketPickupAmount } from '../../../shared/utils/ticketFinance.ts';
import type { Ticket } from '../../../shared/models/ticket.model.ts';
import * as finance from './ticket-finance.js';

// The frontend's display copy computes in the machine's local zone; run it in
// the shop zone so both implementations describe the same calendar.
const originalTz = process.env.TZ;
process.env.TZ = finance.SHOP_TIME_ZONE;
afterAll(() => {
  process.env.TZ = originalTz;
});

const amounts = [0, 1, 5, 16.6, 16.7, 17, 50, 99.9, 100, 333.3, 1234.5];
const fees = [0, 5, 12.5];
// Regina is UTC-6: 05:30Z is 23:30 the previous evening, 06:30Z is 00:30.
const transactions = [
  '2026-01-05T05:30:00Z',
  '2026-01-05T06:30:00Z',
  '2026-02-27T18:00:00Z',
  '2026-12-31T23:59:00Z',
].map((iso) => new Date(iso));
const elapsedHours = [
  0,
  5,
  30,
  7 * 24,
  8 * 24,
  30 * 24,
  31 * 24,
  61 * 24,
  400 * 24,
];
const asOfFor = (start: Date, hours: number) =>
  new Date(start.getTime() + hours * 60 * 60 * 1000);

describe('ticket finance matches the shared display calculation', () => {
  it('base, early and base-pickup amounts', () => {
    for (const amount of amounts) {
      expect(finance.getBaseInterest(amount)).toBe(
        calculation.getBaseIntAmt(amount),
      );
      for (const fee of fees) {
        expect(finance.getEarlyPickupAmount(amount, fee)).toBe(
          calculation.getEarlyAmt(amount, fee),
        );
        expect(finance.getBasePickupAmount(amount, fee)).toBe(
          calculation.getBasePickupAmt(amount, fee),
        );
      }
    }
  });

  it('payment pickup, ticket pickup and interest due across calendar boundaries', () => {
    for (const amount of amounts) {
      for (const fee of fees) {
        for (const start of transactions) {
          for (const hours of elapsedHours) {
            const asOf = asOfFor(start, hours);
            for (const paidMonths of [0, 1, 3]) {
              expect(
                finance.getPaymentPickupAmount(
                  amount,
                  fee,
                  start,
                  paidMonths,
                  asOf,
                ),
              ).toBe(
                calculation.getPaymentPickupAmt(
                  amount,
                  fee,
                  start,
                  paidMonths,
                  asOf,
                ),
              );
              const ticket = {
                amount,
                onetime_fee: fee,
                transaction_datetime: start,
                interest_paid_months: paidMonths,
                recorded_interest_amount_paid: paidMonths ? amount * 0.1 : 0,
                recorded_interest_months_paid: paidMonths ? 1 : 0,
              };
              expect(finance.getTicketPickupAmount(ticket, asOf)).toBe(
                sharedTicketPickupAmount(ticket as unknown as Ticket, asOf),
              );
            }
            expect(finance.getInterestDue(amount, start, asOf)).toBe(
              calculation.getInterestDue(amount, start, asOf),
            );
          }
        }
      }
    }
  });

  it('due dates and calendar comparisons', () => {
    for (const start of transactions) {
      expect(finance.getPawnDueDatetime(start)).toEqual(
        calculation.getDueDatetime(start),
      );
      expect(finance.getSellDueDatetime(start)).toEqual(
        calculation.getSellDueDatetime(start),
      );
      for (const hours of [-30, -1, 0, 1, 5, 7, 30]) {
        const asOf = asOfFor(start, hours);
        expect(finance.isBeforeShopDate(start, asOf)).toBe(
          calculation.isBeforeCalendarDate(start, asOf),
        );
      }
    }
  });
});

describe('legal earliest pickup date', () => {
  const noon = (date: string) => new Date(`${date}T18:00:00Z`);

  it.each([
    ['Monday pawn, no holidays', '2026-05-11', [], '2026-05-14'],
    ['holiday inside the hold', '2026-05-11', ['2026-05-13'], '2026-05-15'],
    ['Friday pawn skips the weekend', '2026-05-15', [], '2026-05-20'],
    [
      'holiday right after the pawn',
      '2026-05-11',
      ['2026-05-12'],
      '2026-05-15',
    ],
  ])('%s', (_, pawnDate, holidays, expected) => {
    expect(finance.getEarliestPickupDate(noon(pawnDate), holidays)).toBe(
      expected,
    );
  });

  it('is allowed from the earliest date on, by shop calendar day', () => {
    const pawn = noon('2026-05-11');
    expect(finance.isPickupAllowed(pawn, [], noon('2026-05-13'))).toBe(false);
    expect(
      finance.isPickupAllowed(pawn, [], new Date('2026-05-14T06:00:00Z')),
    ).toBe(true);
    // 23:59 on May 13 in Regina is already May 14 in UTC.
    expect(
      finance.isPickupAllowed(pawn, [], new Date('2026-05-14T05:59:00Z')),
    ).toBe(false);
  });

  it('uses the shop date of a late-evening pawn, not the UTC date', () => {
    // 23:30 Monday in Regina = 05:30 Tuesday UTC.
    const lateMonday = new Date('2026-05-12T05:30:00Z');
    expect(finance.toShopDateKey(lateMonday)).toBe('2026-05-11');
    expect(finance.getEarliestPickupDate(lateMonday)).toBe('2026-05-14');
  });
});

describe('server time zone independence', () => {
  it('returns identical results when the process runs in another zone', () => {
    const sample = () =>
      transactions.flatMap((start) =>
        elapsedHours.map((hours) => {
          const asOf = asOfFor(start, hours);
          return [
            finance.getPaymentPickupAmount(100, 5, start, 0, asOf),
            finance.getInterestDue(100, start, asOf),
            finance.getEarliestPickupDate(start, ['2026-01-06']),
            finance.isPickupAllowed(start, [], asOf),
            finance.isBeforeShopDate(start, asOf),
          ];
        }),
      );
    const inShopZone = sample();
    for (const zone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      expect(sample()).toEqual(inShopZone);
    }
    process.env.TZ = finance.SHOP_TIME_ZONE;
  });
});
