// Authoritative ticket money and date rules. Calendar dates are taken in the
// shop's time zone explicitly, so results do not depend on the server's TZ
// (a NAS container usually runs in UTC). Saskatchewan has no DST.
export const SHOP_TIME_ZONE = 'America/Regina';

const INTEREST_RATE = 0.3;
const EARLY_PICKUP_DAYS = 7;
const INTEREST_PERIOD_DAYS = 30;
const PAWN_TERM_DAYS = 30;
const SELL_TERM_DAYS = 45;
const PICKUP_HOLD_BUSINESS_DAYS = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const shopDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: SHOP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const round2 = (value: number) => Number(value.toFixed(2));

/** Calendar date (YYYY-MM-DD) of an instant in the shop's time zone. */
export const toShopDateKey = (date: Date) => shopDateFormat.format(date);

// Day numbers count whole calendar days, so date math never sees clock time.
const toDayNumber = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
};
const fromDayNumber = (dayNumber: number) =>
  new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
const shopDayNumber = (date: Date) => toDayNumber(toShopDateKey(date));

const calendarDaysBetween = (start: Date, end: Date) =>
  Math.max(0, shopDayNumber(end) - shopDayNumber(start));

const isBusinessDay = (dayNumber: number, holidays: Set<string>) => {
  const weekday = new Date(dayNumber * MS_PER_DAY).getUTCDay();
  return (
    weekday !== 0 && weekday !== 6 && !holidays.has(fromDayNumber(dayNumber))
  );
};

export type FinanceTicket = {
  amount: number;
  onetime_fee: number;
  transaction_datetime: Date;
  interest_paid_months: number;
  recorded_interest_amount_paid: number;
  recorded_interest_months_paid: number;
};

export const getBaseInterest = (amount: number) =>
  round2(amount * INTEREST_RATE);

export const getBasePickupAmount = (amount: number, onetimeFee: number) =>
  round2(amount + getBaseInterest(amount) + onetimeFee);

export const getEarlyPickupAmount = (amount: number, onetimeFee: number) => {
  const regularInterest = getBaseInterest(amount);
  if (regularInterest <= 5)
    return round2(amount + regularInterest + onetimeFee);
  const reducedInterest = Math.max(5, round2(amount * 0.1));
  return round2(amount + reducedInterest + onetimeFee);
};

/** Pickup amount before credit for interest already paid. */
export const getPaymentPickupAmount = (
  amount: number,
  onetimeFee: number,
  transactionDatetime: Date,
  interestPaidMonths = 0,
  asOf = new Date(),
) => {
  const elapsedDays = calendarDaysBetween(transactionDatetime, asOf);
  if (elapsedDays <= EARLY_PICKUP_DAYS) {
    return getEarlyPickupAmount(amount, onetimeFee);
  }
  const minimumPickup = amount + onetimeFee;
  const owedMonths = Math.max(1, Math.ceil(elapsedDays / INTEREST_PERIOD_DAYS));
  const unpaidMonths = Math.max(
    0,
    owedMonths - Math.max(0, interestPaidMonths),
  );
  const pickup = minimumPickup + unpaidMonths * getBaseInterest(amount);
  return round2(Math.max(minimumPickup, pickup));
};

/**
 * Amount to pick up a ticket now. Recorded interest payments are credited by
 * amount; months extended before payments were recorded (legacy data) are
 * credited at today's base interest.
 */
export const getTicketPickupAmount = (
  ticket: FinanceTicket,
  asOf = new Date(),
) => {
  const recordedAmount = Math.max(0, ticket.recorded_interest_amount_paid);
  const recordedMonths = Math.max(0, ticket.recorded_interest_months_paid);
  const legacyMonths = Math.max(
    0,
    ticket.interest_paid_months - recordedMonths,
  );
  const legacyCredit = getBaseInterest(ticket.amount) * legacyMonths;
  const grossPickup = getPaymentPickupAmount(
    ticket.amount,
    ticket.onetime_fee,
    ticket.transaction_datetime,
    0,
    asOf,
  );
  const minimumPickup = ticket.amount + ticket.onetime_fee;
  return round2(
    Math.max(minimumPickup, grossPickup - recordedAmount - legacyCredit),
  );
};

export const getInterestDue = (
  amount: number,
  dueDate: Date,
  asOf = new Date(),
) => {
  const daysPastDue = calendarDaysBetween(dueDate, asOf);
  if (daysPastDue === 0) return 0;
  const monthsDue = Math.ceil(daysPastDue / INTEREST_PERIOD_DAYS);
  return round2(getBaseInterest(amount) * monthsDue);
};

/**
 * Legal hold: the item may be released on the day after the second business
 * day (weekends and shop holidays excluded) following the transaction date.
 */
export const getEarliestPickupDate = (
  transactionDatetime: Date,
  holidayDateKeys: Iterable<string> = [],
  holdBusinessDays = PICKUP_HOLD_BUSINESS_DAYS,
) => {
  const holidays = new Set(holidayDateKeys);
  let cursor = shopDayNumber(transactionDatetime);
  let counted = 0;
  while (counted < holdBusinessDays) {
    cursor += 1;
    if (isBusinessDay(cursor, holidays)) counted += 1;
  }
  return fromDayNumber(cursor + 1);
};

export const isPickupAllowed = (
  transactionDatetime: Date,
  holidayDateKeys: Iterable<string> = [],
  asOf = new Date(),
) =>
  toShopDateKey(asOf) >=
  getEarliestPickupDate(transactionDatetime, holidayDateKeys);

/** True when `date` falls on an earlier shop calendar day than `asOf`. */
export const isBeforeShopDate = (date: Date, asOf = new Date()) =>
  shopDayNumber(date) < shopDayNumber(asOf);

export const getPawnDueDatetime = (from: Date) =>
  new Date(from.getTime() + PAWN_TERM_DAYS * MS_PER_DAY);

export const getSellDueDatetime = (from: Date) =>
  new Date(from.getTime() + SELL_TERM_DAYS * MS_PER_DAY);
