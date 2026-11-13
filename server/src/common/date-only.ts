// A DATE column value, which the server pool returns as YYYY-MM-DD (see
// DatabaseModule). Anything else means that parsing changed, so fail loudly
// instead of sending text like "Sat Jan 01 1990 ..." to the client.
export const dateOnly = (value: unknown, column: string): string => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  throw new Error(`Expected ${column} as YYYY-MM-DD, got ${String(value)}.`);
};
