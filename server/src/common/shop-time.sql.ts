import { SHOP_TIME_ZONE } from '../ticket/ticket-finance.js';

// The database runs in UTC, so a report day must start at midnight in the
// shop's time zone, not at midnight UTC (6 PM in Regina).
export const shopDayStart = (param: string) =>
  `(${param}::timestamp AT TIME ZONE '${SHOP_TIME_ZONE}')`;

// A timestamptz column as text in the shop's time zone, e.g. 'YYYY-MM-DD'.
export const shopTimeSql = (column: string, format: string) =>
  `TO_CHAR(${column} AT TIME ZONE '${SHOP_TIME_ZONE}', '${format}')`;

// YYYY-MM-DD day in the shop's time zone.
export const shopDateSql = (column: string) =>
  shopTimeSql(column, 'YYYY-MM-DD');
