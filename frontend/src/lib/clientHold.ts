// A calendar date, never a timestamp: holds include the selected final day.
export const normalizeClientHoldDate = (
  value: string | null,
): string | null => {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Enter a valid hold date.");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    value < "1000-01-01"
  ) {
    throw new Error("Enter a valid hold date.");
  }
  return value;
};
