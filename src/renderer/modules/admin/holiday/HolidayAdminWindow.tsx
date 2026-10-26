import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import React from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { HolidayDate } from "../../../../shared/models/holiday-date.model";
import { ticketApi } from "../../tickets/ticket.api";
import WindowLayout from "../../../windows/WindowLayout";
import type { WindowScreenProps } from "../../../windows/windowRegistry";
import HolidayAddDialog from "./HolidayAddDialog";

const formatHolidayDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
};

const normalizeYear = (value: string) => value.trim();

const isValidYear = (value: string) => /^\d{4}$/.test(value);

const HolidayAdminWindow: React.FC<WindowScreenProps> = () => {
  const [pending, setPending] = React.useState<HolidayDate | null>(null);
  const currentYear = String(new Date().getFullYear());
  const yearInputRef = React.useRef<HTMLInputElement>(null);
  const [yearInput, setYearInput] = React.useState(currentYear);
  const [searchedYear, setSearchedYear] = React.useState(currentYear);
  const [holidays, setHolidays] = React.useState<HolidayDate[]>([]);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [removingDate, setRemovingDate] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      yearInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const loadHolidaysForYear = React.useCallback(
    async (year: string, showMessage = false) => {
      setLoading(true);
      setError("");
      setMessage("");

      try {
        const results = await ticketApi.loadHolidayDates();
        const yearHolidays = results.filter((holiday) =>
          holiday.holiday_date.startsWith(`${year}-`),
        );

        setHolidays(yearHolidays);
        setSearchedYear(year);

        if (showMessage) {
          setMessage(`${yearHolidays.length} holiday(s) found for ${year}.`);
        }
      } catch (err) {
        console.error(err);
        setHolidays([]);
        setError(
          err instanceof Error ? err.message : "Unable to load holidays.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    void loadHolidaysForYear(currentYear);
  }, [currentYear, loadHolidaysForYear]);

  const handleSearch = async () => {
    const year = normalizeYear(yearInput);

    if (!isValidYear(year)) {
      setError("Enter a four-digit year.");
      setMessage("");
      yearInputRef.current?.focus();
      return;
    }

    setYearInput(year);
    await loadHolidaysForYear(year, true);
  };

  const handleClear = () => {
    setYearInput(currentYear);
    void loadHolidaysForYear(currentYear);
  };

  const handleRemoveHoliday = async (holiday: HolidayDate) => {
    setRemovingDate(holiday.holiday_date);
    setError("");
    setMessage("");

    try {
      await ticketApi.deleteHolidayDate(holiday.holiday_date);
      setHolidays((prev) =>
        prev.filter(
          (existingHoliday) =>
            existingHoliday.holiday_date !== holiday.holiday_date,
        ),
      );
      setMessage(`${formatHolidayDate(holiday.holiday_date)} was removed.`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to remove holiday.",
      );
    } finally {
      setRemovingDate("");
    }
  };

  const busy = loading || Boolean(removingDate);

  return (
    <WindowLayout
      title="Holiday"
      description="Search holidays by year, add new dates, or remove existing dates."
    >
      <Stack spacing={1.25} sx={{ height: "100%", minHeight: 0, pt: 0.5 }}>
        <Stack spacing={1} sx={{ flexShrink: 0 }}>
          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSearch();
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "180px auto minmax(0, 1fr) auto",
                gap: 1,
                alignItems: "start",
              }}
            >
              <TextField
                inputRef={yearInputRef}
                fullWidth
                size="small"
                label="Year"
                value={yearInput}
                onChange={(event) => {
                  setYearInput(event.target.value);
                  setError("");
                  setMessage("");
                }}
                inputProps={{ inputMode: "numeric", maxLength: 4 }}
                helperText="Enter a four-digit year."
              />
              <Stack direction="row" spacing={1} sx={{ mt: 0.25 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={busy}
                  sx={{ minWidth: 96 }}
                >
                  {loading ? "Searching..." : "Search"}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  disabled={busy}
                  onClick={handleClear}
                >
                  Clear
                </Button>
              </Stack>
              <Box />
              <Button
                type="button"
                variant="contained"
                color="success"
                disabled={busy}
                onClick={() => setAddDialogOpen(true)}
                sx={{ mt: 0.25, justifySelf: "end" }}
              >
                Add Holiday
              </Button>
            </Box>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}
          {loading && <Alert severity="info">Loading holidays...</Alert>}
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: 0.5 }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
            {searchedYear} Holidays ({holidays.length})
          </Typography>

          {!loading && holidays.length === 0 ? (
            <Alert severity="info">
              No holidays have been added for {searchedYear}.
            </Alert>
          ) : (
            <Stack spacing={0.5}>
              {holidays.map((holiday) => (
                <Paper
                  key={holiday.holiday_date}
                  variant="outlined"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    columnGap: 1,
                    alignItems: "center",
                    width: "100%",
                    px: 1,
                    py: 0.5,
                    bgcolor: "#eef6ff",
                    boxSizing: "border-box",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {formatHolidayDate(holiday.holiday_date)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {holiday.name}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={busy}
                    sx={{ minWidth: 76, justifySelf: "end" }}
                    onClick={() => setPending(holiday)}
                  >
                    {removingDate === holiday.holiday_date
                      ? "Removing..."
                      : "Remove"}
                  </Button>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>

        <HolidayAddDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          onSave={(holiday) => {
            const holidayYear = holiday.holiday_date.slice(0, 4);
            setYearInput(holidayYear);
            setSearchedYear(holidayYear);
            setHolidays((prev) =>
              holidayYear === searchedYear
                ? [...prev, holiday].sort((a, b) =>
                    a.holiday_date.localeCompare(b.holiday_date),
                  )
                : [holiday],
            );
            setError("");
            setMessage(
              `${holiday.name} on ${formatHolidayDate(holiday.holiday_date)} was added.`,
            );
          }}
        />
      </Stack>
      <ConfirmDialog
        open={Boolean(pending)}
        title="Remove holiday"
        message={
          pending
            ? `Remove ${formatHolidayDate(pending.holiday_date)}? This date will be removed from the holiday calendar.`
            : ""
        }
        confirmLabel="Remove"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          void handleRemoveHoliday(pending);
          setPending(null);
        }}
      />
    </WindowLayout>
  );
};

export default HolidayAdminWindow;
