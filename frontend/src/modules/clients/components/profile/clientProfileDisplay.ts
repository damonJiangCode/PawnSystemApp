import { formatClientOption } from "../../utils/clientDisplay.ts";
import {
  formatDisplayValue,
  formatShortDate,
  formatUppercase,
} from "../../../../shared/utils/formatters.ts";

export const clientProfilePanelSx = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column" as const,
  border: "1px solid rgba(25, 118, 210, 0.14)",
  borderRadius: 2,
  p: 1.1,
  boxShadow: 2,
  backgroundColor: "rgba(25, 118, 210, 0.03)",
  minHeight: 0,
  boxSizing: "border-box" as const,
};

export const createClientProfileDisplay = (placeholder: boolean) => ({
  text: (value: unknown) =>
    placeholder ? "—" : formatDisplayValue(value, "—"),
  option: (value?: string | null) =>
    placeholder ? "—" : formatClientOption(value),
  uppercase: (value?: string | null) =>
    placeholder ? "—" : formatUppercase(value, "—"),
  count: (value: number | undefined) =>
    placeholder ? "—" : String(value ?? 0),
  date: (value: unknown) => {
    if (placeholder || !value) {
      return "—";
    }

    return formatShortDate(value as string | Date);
  },
  measurement: (value: number | undefined, unit: string) =>
    placeholder || value === undefined ? "—" : `${value} ${unit}`,
});
