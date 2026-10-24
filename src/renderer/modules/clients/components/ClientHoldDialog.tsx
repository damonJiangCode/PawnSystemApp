import React from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import type { Client } from "../../../../shared/models/client.model";
import { normalizeClientHoldDate } from "../../../../shared/utils/clientHold";
import { clientApi } from "../client.api";

type Props = {
  client: Client;
  onClose: () => void;
  onSaved: (client: Client) => void;
};

const getToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Regina",
  }).format(new Date());

export default function ClientHoldDialog({ client, onClose, onSaved }: Props) {
  const today = getToday();
  const [date, setDate] = React.useState(() => {
    const [year, month, day] = today.split("-");
    return `${month}-${day}-${year}`;
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const passwordInputRef = React.useRef<HTMLInputElement>(null);
  const datePickerRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!passwordError || saving) return;
    passwordInputRef.current?.focus();
    passwordInputRef.current?.select();
  }, [passwordError, saving]);

  const save = async (value: string | null) => {
    if (saving || !client.client_number) return;
    setError("");
    setPasswordError("");
    try {
      const parts =
        value === null ? null : /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
      if (value !== null && !parts) {
        throw new Error("Enter a valid hold date using MM-DD-YYYY.");
      }
      const normalized = normalizeClientHoldDate(
        parts ? `${parts[3]}-${parts[1]}-${parts[2]}` : null,
      );
      if (normalized !== null && normalized < getToday()) {
        throw new Error("Hold date must be today or later.");
      }
      if (normalized !== null && !password.trim()) {
        setPasswordError("Enter employee password.");
        return;
      }
      setSaving(true);
      const updated = await clientApi.setHoldUntil(
        client.client_number,
        normalized,
        normalized === null ? undefined : password.trim(),
      );
      onSaved(updated);
      onClose();
    } catch (err) {
      if (
        err instanceof Error &&
        (err as { field?: string }).field === "employee_password"
      ) {
        setPasswordError(err.message);
      } else {
        setError(
          err instanceof Error ? err.message : "Unable to save the hold.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={saving ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="client-hold-title"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (date) void save(date);
        }}
      >
        <DialogTitle id="client-hold-title">Hold Client Items</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography>
              {client.first_name} {client.last_name}
            </Typography>
            <TextField
              label="Hold until (MM-DD-YYYY)"
              placeholder="MM-DD-YYYY"
              value={date}
              autoFocus
              required
              disabled={saving}
              onChange={(event) => setDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ maxLength: 10 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end" sx={{ position: "relative" }}>
                    <IconButton
                      aria-label="Choose hold date"
                      disabled={saving}
                      onClick={() => {
                        const picker = datePickerRef.current;
                        if (!picker) return;
                        const parts = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date);
                        picker.value = parts
                          ? `${parts[3]}-${parts[1]}-${parts[2]}`
                          : "";
                        picker.showPicker();
                      }}
                    >
                      <CalendarMonthIcon />
                    </IconButton>
                    <input
                      ref={datePickerRef}
                      type="date"
                      min={today}
                      max="9999-12-31"
                      tabIndex={-1}
                      aria-hidden="true"
                      disabled={saving}
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 1,
                        height: 1,
                        opacity: 0,
                        pointerEvents: "none",
                      }}
                      onChange={(event) => {
                        const [year, month, day] =
                          event.target.value.split("-");
                        if (year && month && day)
                          setDate(`${month}-${day}-${year}`);
                      }}
                    />
                  </InputAdornment>
                ),
              }}
            />
            <Typography variant="body2" color="text.secondary">
              All this client's tickets are excluded from overdue reports whose
              cutoff is on or before this date. Ticket due dates do not change.
            </Typography>
            <TextField
              label="Employee Password"
              type="password"
              inputRef={passwordInputRef}
              autoComplete="off"
              value={password}
              disabled={saving}
              error={Boolean(passwordError)}
              helperText={
                passwordError ||
                "Required to set a hold; not required to clear it."
              }
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError("");
              }}
            />
            {client.hold_until && (
              <Typography variant="body2">
                Saved hold: {client.hold_until.slice(5, 7)}-
                {client.hold_until.slice(8, 10)}-{client.hold_until.slice(0, 4)}
              </Typography>
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          {client.hold_until && (
            <Button
              color="warning"
              disabled={saving}
              onClick={() => void save(null)}
            >
              Clear Hold
            </Button>
          )}
          <Button disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving || !date}>
            {saving ? "Saving..." : "Confirm"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
