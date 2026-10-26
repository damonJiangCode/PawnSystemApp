import DateField from "../../../shared/components/DateField";
import React from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Client } from "../../../../../shared/models/client.model";
import { normalizeClientHoldDate } from "../../../../../shared/utils/clientHold";
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
  const [date, setDate] = React.useState(today);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const passwordInputRef = React.useRef<HTMLInputElement>(null);

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
      if (value !== null && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error("Enter a valid hold date using MM-DD-YYYY.");
      }
      const normalized = normalizeClientHoldDate(value);
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
        <DialogTitle id="client-hold-title">Hold client items</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography>
              {client.first_name} {client.last_name}
            </Typography>
            <DateField
              label="Hold until (MM-DD-YYYY)"
              value={date}
              onValueChange={setDate}
              min={today}
              autoFocus
              required
              disabled={saving}
            />
            <Typography variant="body2" color="text.secondary">
              All this client's tickets are excluded from overdue reports whose
              cutoff is on or before this date. Ticket due dates do not change.
            </Typography>
            <TextField
              label="Employee password"
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
              style={{ textTransform: "none" }}
              color="warning"
              disabled={saving}
              onClick={() => void save(null)}
            >
              Clear hold
            </Button>
          )}
          <Button
            style={{ textTransform: "none" }}
            type="submit"
            variant="contained"
            disabled={saving || !date}
          >
            {saving ? "Saving..." : "Confirm"}
          </Button>
          <Button
            style={{ textTransform: "none" }}
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
