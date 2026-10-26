import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Box,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  type SxProps,
  type Theme,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import {
  calendarDate,
  dateParts,
  dateSegments,
  pastedDate,
  segmentDigits,
  type DateOrder,
} from "../utils/dateInput";

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  format?: DateOrder;
  label: string;
  name?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  autoFocus?: boolean;
  onBlur?: () => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  margin?: "none" | "dense" | "normal";
  error?: boolean;
  helperText?: React.ReactNode;
  sx?: SxProps<Theme>;
};

/** Editable segments are text inputs; the native date input is only a calendar picker. */
export default function DateField({
  value,
  onValueChange,
  format = "MM-DD-YYYY",
  label,
  name,
  inputRef,
  autoFocus,
  onBlur,
  min = "0001-01-01",
  max = "9999-12-31",
  disabled,
  required,
  fullWidth,
  size = "medium",
  margin,
  error,
  helperText,
  sx,
}: Props) {
  const id = useId();
  const keys = dateSegments(format);
  const [parts, setParts] = useState(() => dateParts(value, format));
  const [touched, setTouched] = useState(false);
  const emitted = useRef(value);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const picker = useRef<HTMLInputElement>(null);
  const pendingFocus = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (pendingFocus.current === null) return;
    const input = inputs.current[pendingFocus.current];
    pendingFocus.current = null;
    input?.focus();
    input?.select();
  }, [parts]);
  useEffect(() => {
    if (value !== emitted.current) {
      setParts(dateParts(value, format));
      emitted.current = value;
      setTouched(false);
    }
  }, [value, format]);
  const iso = calendarDate(parts, format);
  const hasInput = parts.some(Boolean);
  const invalid = hasInput && (!iso || iso < min || iso > max);
  const showError = error || (touched && invalid);
  const focus = (index: number) => {
    const input = inputs.current[index];
    input?.focus();
    input?.select();
  };
  const update = (next: string[]) => {
    setParts(next);
    const date = calendarDate(next, format);
    // Incomplete/invalid edits must clear the caller's previous date, never save stale data.
    emitted.current = date && date >= min && date <= max ? date : "";
    onValueChange(emitted.current);
  };
  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      margin={margin}
      error={showError}
      disabled={disabled}
      required={required}
      sx={sx}
    >
      <InputLabel
        id={`${id}-label`}
        shrink
        sx={{ backgroundColor: "background.paper", px: 0.5 }}
      >
        {label}
      </InputLabel>
      <Box
        role="group"
        aria-labelledby={`${id}-label`}
        onBlur={(event: React.FocusEvent<HTMLDivElement>) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null))
            return;
          setTouched(true);
          onBlur?.();
        }}
        sx={{
          typography: "body1",
          lineHeight: "1.4375em",
          display: "flex",
          alignItems: "center",
          position: "relative",
          border: 1,
          borderRadius: 1,
          borderColor: showError ? "error.main" : "rgba(0,0,0,0.23)",
          px: 1.5,
          height: size === "small" ? 40 : 56,
          color: disabled ? "text.disabled" : "text.primary",
          "&:focus-within": {
            outline: "2px solid",
            outlineColor: showError ? "error.main" : "primary.main",
            outlineOffset: -2,
          },
          "&:hover": { borderColor: disabled ? undefined : "text.primary" },
        }}
      >
        {keys.map((key, index) => (
          <React.Fragment key={key}>
            {index > 0 && (
              <Box component="span" aria-hidden="true">
                -
              </Box>
            )}
            <Box
              component="input"
              ref={(element: HTMLInputElement | null) => {
                inputs.current[index] = element;
                if (index === 0) {
                  if (typeof inputRef === "function") inputRef(element);
                  else if (inputRef)
                    (
                      inputRef as React.MutableRefObject<HTMLInputElement | null>
                    ).current = element;
                }
              }}
              aria-label={`${label}: ${key === "YYYY" ? "year" : key === "MM" ? "month" : "day"}`}
              aria-invalid={showError || undefined}
              aria-describedby={
                helperText || (touched && invalid) ? `${id}-help` : undefined
              }
              placeholder={key}
              value={parts[index]}
              inputMode="numeric"
              autoComplete="off"
              maxLength={key.length}
              disabled={disabled}
              required={required}
              autoFocus={index === 0 && autoFocus}
              onFocus={(event: React.FocusEvent<HTMLInputElement>) =>
                event.target.select()
              }
              onClick={(event: React.MouseEvent<HTMLInputElement>) =>
                event.currentTarget.select()
              }
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const next = [...parts];
                next[index] = segmentDigits(event.target.value, key.length);
                if (next[index].length === key.length && index < 2)
                  pendingFocus.current = index + 1;
                update(next);
              }}
              onPaste={(event: React.ClipboardEvent<HTMLInputElement>) => {
                event.preventDefault();
                const next = pastedDate(
                  event.clipboardData.getData("text"),
                  format,
                );
                if (next) {
                  pendingFocus.current = 2;
                  update(next);
                } else {
                  const updated = [...parts];
                  updated[index] = segmentDigits(
                    event.clipboardData.getData("text"),
                    key.length,
                  );
                  if (updated[index].length === key.length && index < 2)
                    pendingFocus.current = index + 1;
                  update(updated);
                }
              }}
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.altKey && event.key === "ArrowDown") {
                  event.preventDefault();
                  picker.current?.showPicker();
                } else if (
                  ["ArrowLeft", "ArrowRight", "-", "/"].includes(event.key)
                ) {
                  event.preventDefault();
                  focus(
                    Math.max(
                      0,
                      Math.min(2, index + (event.key === "ArrowLeft" ? -1 : 1)),
                    ),
                  );
                } else if (
                  event.key === "Backspace" &&
                  !parts[index] &&
                  index > 0
                ) {
                  event.preventDefault();
                  focus(index - 1);
                }
              }}
              onBlur={() => {
                if (key !== "YYYY" && parts[index].length === 1) {
                  const next = [...parts];
                  next[index] = parts[index].padStart(2, "0");
                  update(next);
                }
              }}
              sx={{
                font: "inherit",
                letterSpacing: "inherit",
                color: "inherit",
                background: "transparent",
                border: 0,
                outline: 0,
                width: `${key.length + 0.2}ch`,
                minWidth: 0,
                p: 0,
                textAlign: "center",
                "&::placeholder": { opacity: 0.6, color: "inherit" },
                "&:focus": {
                  backgroundColor: "action.selected",
                  borderRadius: 0.5,
                },
              }}
            />
          </React.Fragment>
        ))}
        <IconButton
          size="small"
          disabled={disabled}
          tabIndex={-1}
          aria-label={`Choose ${label.toLowerCase()}`}
          sx={{ ml: "auto", p: 0.25 }}
          onClick={() => picker.current?.showPicker()}
        >
          <CalendarMonthIcon fontSize="small" />
        </IconButton>
        <input
          ref={picker}
          type="date"
          value={iso}
          min={min}
          max={max}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            opacity: 0,
            bottom: 0,
            right: 0,
            pointerEvents: "none",
          }}
          onChange={(event) => {
            update(dateParts(event.target.value, format));
            focus(0);
          }}
        />
        {name && <input type="hidden" name={name} value={value} />}
      </Box>
      {(helperText || (touched && invalid)) && (
        <FormHelperText id={`${id}-help`}>
          {touched && invalid
            ? min !== "0001-01-01"
              ? `Enter a date on or after ${dateParts(min, format).join("-")}.`
              : "Enter a valid date."
            : helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
}
