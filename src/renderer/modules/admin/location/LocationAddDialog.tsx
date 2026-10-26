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
} from "@mui/material";
import type { Location } from "../../../../shared/models/location.model";
import type { SaveLocationInput } from "../../../../shared/payload-contracts/ticket.contract";
import { ticketApi } from "../../tickets/ticket.api";

type LocationAddDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (location: Location) => void;
};

const emptyInput = (): SaveLocationInput => ({
  location: "",
  description: "",
});

const LocationAddDialog: React.FC<LocationAddDialogProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const codeInputRef = React.useRef<HTMLInputElement>(null);
  const [input, setInput] = React.useState<SaveLocationInput>(emptyInput());
  const [codeError, setCodeError] = React.useState("");
  const [descriptionError, setDescriptionError] = React.useState("");
  const [submitError, setSubmitError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setInput(emptyInput());
    setCodeError("");
    setDescriptionError("");
    setSubmitError("");
    setSaving(false);

    const frame = requestAnimationFrame(() => codeInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const handleCodeChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setInput((prev) => ({
      ...prev,
      location: event.target.value.toUpperCase().slice(0, 4),
    }));
    setCodeError("");
    setSubmitError("");
  };

  const handleDescriptionChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setInput((prev) => ({
      ...prev,
      description: event.target.value.slice(0, 1000),
    }));
    setDescriptionError("");
    setSubmitError("");
  };

  const handleAdd = async () => {
    const nextCodeError = /^[A-Z]{2}\d{2}$/.test(input.location)
      ? ""
      : "Use two uppercase letters followed by two digits, for example AB12.";
    const nextDescriptionError =
      input.description.length <= 1000
        ? ""
        : "Description cannot exceed 1000 characters.";

    setCodeError(nextCodeError);
    setDescriptionError(nextDescriptionError);

    if (nextCodeError || nextDescriptionError) {
      return;
    }

    setSaving(true);
    setSubmitError("");

    try {
      const location = await ticketApi.addLocation(input);
      onSave(location);
      onClose();
    } catch (err) {
      console.error(err);
      setSubmitError(
        err instanceof Error ? err.message : "Unable to add location.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Location</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25} sx={{ pt: 0.5 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          <TextField
            inputRef={codeInputRef}
            label="Location Code"
            value={input.location}
            onChange={handleCodeChange}
            error={Boolean(codeError)}
            helperText={
              codeError || "Two uppercase letters followed by two digits."
            }
            inputProps={{ maxLength: 4 }}
            required
            fullWidth
            size="small"
          />
          <TextField
            label="Description"
            value={input.description}
            onChange={handleDescriptionChange}
            error={Boolean(descriptionError)}
            helperText={
              descriptionError ||
              `${input.description.length}/1000 characters. Optional.`
            }
            multiline
            minRows={4}
            fullWidth
            size="small"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="success"
          onClick={() => void handleAdd()}
          disabled={saving}
        >
          {saving ? "Adding..." : "Add"}
        </Button>
        <Button onClick={onClose} disabled={saving}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationAddDialog;
