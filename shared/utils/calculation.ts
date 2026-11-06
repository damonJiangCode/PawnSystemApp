const MS_PER_DAY = 1000 * 60 * 60 * 24;

const getCalendarDate = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getCalendarDayDiff = (start: Date, end: Date) => {
  const startDate = getCalendarDate(start);
  const endDate = getCalendarDate(end);
  return Math.max(
    0,
    Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY),
  );
};

export const calculation = {
  getEarlyAmt: (amt: number, otf: number) => {
    const regularInterest = calculation.getBaseIntAmt(amt) ?? 0;

    if (regularInterest <= 5) {
      return Number((amt + regularInterest + otf).toFixed(2));
    }

    const reducedInterest = Math.max(5, Number((amt * 0.1).toFixed(2)));
    return Number((amt + reducedInterest + otf).toFixed(2));
  },

  getBaseIntAmt: (amt: number) => {
    const INTEREST_RATE = 0.3;
    return Number((amt * INTEREST_RATE).toFixed(2));
  },

  getBasePickupAmt: (amt: number, otf: number) => {
    const interest = calculation.getBaseIntAmt(amt) ?? 0;
    return Number((amt + interest + otf).toFixed(2));
  },

  getPaymentPickupAmt: (
    amt: number,
    otf: number,
    transactionDatetime: Date,
    interestPaidMonths = 0,
    asOf = new Date(),
  ) => {
    const elapsedDays = getCalendarDayDiff(transactionDatetime, asOf);

    if (elapsedDays <= 7) {
      return calculation.getEarlyAmt(amt, otf);
    }

    const interest = calculation.getBaseIntAmt(amt) ?? 0;
    const minimumPickup = amt + otf;
    const owedInterestMonths = Math.max(1, Math.ceil(elapsedDays / 30));
    const unpaidInterestMonths = Math.max(
      0,
      owedInterestMonths - Math.max(0, interestPaidMonths),
    );
    const pickup = minimumPickup + unpaidInterestMonths * interest;

    return Number(Math.max(minimumPickup, pickup).toFixed(2));
  },

  getInterestDue: (amt: number, dueDate: Date, asOf = new Date()) => {
    const daysPastDue = getCalendarDayDiff(dueDate, asOf);

    if (daysPastDue === 0) {
      return 0;
    }

    const monthsDue = Math.ceil(daysPastDue / 30);
    return Number((calculation.getBaseIntAmt(amt) * monthsDue).toFixed(2));
  },

  isBeforeCalendarDate: (date: Date, asOf = new Date()) => {
    return getCalendarDate(date).getTime() < getCalendarDate(asOf).getTime();
  },

  getCurrentDatetime: () => {
    return new Date();
  },

  getDueDatetime: (curDatetime: Date) => {
    const due = new Date(curDatetime);
    due.setDate(due.getDate() + 30);
    return due;
  },

  getSellDueDatetime: (transactionDatetime: Date) => {
    const due = new Date(transactionDatetime);
    due.setDate(due.getDate() + 45);
    return due;
  },
};
