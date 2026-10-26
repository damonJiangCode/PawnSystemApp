export type DateOrder = "MM-DD-YYYY" | "YYYY-MM-DD";
export const dateSegments = (order: DateOrder) => order.split("-");

export function dateParts(value: string, order: DateOrder): string[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return ["", "", ""];
  const parts: Record<string, string> = {
    YYYY: match[1],
    MM: match[2],
    DD: match[3],
  };
  return dateSegments(order).map((part) => parts[part]);
}

export function calendarDate(parts: string[], order: DateOrder): string {
  const keys = dateSegments(order);
  if (parts.some((part, i) => part.length !== keys[i].length)) return "";
  const year = parts[keys.indexOf("YYYY")];
  const month = parts[keys.indexOf("MM")];
  const day = parts[keys.indexOf("DD")];
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number(year) > 0 &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === iso
    ? iso
    : "";
}

export function pastedDate(text: string, order: DateOrder): string[] | null {
  const keys = dateSegments(order);
  const pattern =
    order === "MM-DD-YYYY"
      ? /^(\d{2})[-/](\d{2})[-/](\d{4})$/
      : /^(\d{4})[-/](\d{2})[-/](\d{2})$/;
  const match = pattern.exec(text.trim());
  if (match) return match.slice(1);
  if (!/^\d{8}$/.test(text.trim())) return null;
  let offset = 0;
  return keys.map((key) => {
    const part = text.trim().slice(offset, offset + key.length);
    offset += key.length;
    return part;
  });
}

export function segmentDigits(value: string, length: number): string {
  return value.replace(/\D/g, "").slice(0, length);
}
