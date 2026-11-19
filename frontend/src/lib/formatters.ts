const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

// Convert a displayed calendar date to the API date without timezone conversion.
export const parseMonthDayYear = (value: string): string | null => {
  const parts = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (!parts) return null;
  const iso = `${parts[3]}-${parts[1]}-${parts[2]}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === iso
    ? iso
    : null;
};

export const formatLocalIsoDatePart = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const resolveDate = (value?: string | Date | null) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const dateOnlyMatch = value.match(dateOnlyPattern);
  const parsed = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDisplayValue = (value: unknown, fallback = "-"): string => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
};

export const formatShortDate = (value?: string | Date | null): string => {
  const parsed = resolveDate(value);
  if (!parsed) {
    return value ? String(value) : "";
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

export const formatIsoDate = (value?: string | Date | null): string => {
  const parsed = resolveDate(value);
  if (!parsed) {
    return value ? String(value) : "";
  }

  return formatLocalIsoDatePart(parsed);
};

export const formatIsoDateTime = (value?: string | Date | null): string => {
  const parsed = resolveDate(value);
  if (!parsed) {
    return value ? String(value) : "";
  }

  const datePart = formatLocalIsoDatePart(parsed);
  const timePart = parsed.toTimeString().slice(0, 8);
  return `${datePart} ${timePart}`;
};

export const formatCurrency = (
  value?: number | null,
  fallback = "---",
): string => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return `$${value.toFixed(1)}`;
};

export const formatUppercase = (
  value?: string | null,
  fallback = "",
): string => {
  if (!value) {
    return fallback;
  }

  return value.toUpperCase();
};
