import React from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import type { IdType } from "../../../../../shared/models/id-type.model";
import { referenceApi } from "../reference.api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (type: IdType) => void;
};
export default function IdTypeAddDialog({ open, onClose, onSave }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setName("");
    setError("");
    setSaving(false);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setError("ID type is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      onSave(await referenceApi.addIdType(name));
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to add ID type.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <form onSubmit={save}>
        <DialogTitle>Add ID Type</DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            label="ID type"
            inputRef={inputRef}
            fullWidth
            required
            size="small"
            value={name}
            disabled={saving}
            inputProps={{ maxLength: 500 }}
            helperText="Use the name you want staff to see."
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Adding..." : "Add"}
          </Button>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
