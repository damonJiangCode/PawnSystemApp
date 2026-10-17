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
import type { Client } from "../../../../shared/models/client.model";
import { normalizeClientHoldDate } from "../../../../shared/utils/clientHold";
import { clientApi } from "../client.api";

type Props = {
  client: Client;
  onClose: () => void;
  onSaved: (client: Client) => void;
};

export default function ClientHoldDialog({ client, onClose, onSaved }: Props) {
  const [date, setDate] = React.useState(client.hold_until ?? "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const save = async (value: string | null) => {
    if (saving || !client.client_number) return;
    setError("");
    try {
      const normalized = normalizeClientHoldDate(value);
      setSaving(true);
      const updated = await clientApi.setHoldUntil(
        client.client_number,
        normalized,
      );
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the hold.");
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
              label="Hold until"
              type="date"
              value={date}
              autoFocus
              required
              disabled={saving}
              onChange={(event) => setDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: "1000-01-01", max: "9999-12-31" }}
            />
            <Typography variant="body2" color="text.secondary">
              All this client's tickets are excluded from overdue reports whose
              cutoff is on or before this date. Ticket due dates do not change.
            </Typography>
            {client.hold_until && (
              <Typography variant="body2">
                Saved hold: {client.hold_until}
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
