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
} from "@mui/material";
import type { HolidayDate } from "../../../../shared/models/holiday-date.model";
import type { SaveHolidayInput } from "../../../../shared/payload-contracts/ticket.contract";
import { ticketApi } from "../../tickets/ticket.api";

type HolidayAddDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (holiday: HolidayDate) => void;
};

const emptyInput = (): SaveHolidayInput => ({
  holiday_date: "",
  name: "",
});

const HolidayAddDialog: React.FC<HolidayAddDialogProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const [input, setInput] = React.useState<SaveHolidayInput>(emptyInput());
  const [dateError, setDateError] = React.useState("");
  const [nameError, setNameError] = React.useState("");
  const [submitError, setSubmitError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setInput(emptyInput());
    setDateError("");
    setNameError("");
    setSubmitError("");
    setSaving(false);

    const frame = requestAnimationFrame(() => dateInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setInput((prev) => ({ ...prev, [name]: value }));
    setSubmitError("");

    if (name === "holiday_date") {
      setDateError("");
    } else if (name === "name") {
      setNameError("");
    }
  };

  const handleAdd = async () => {
    const nextDateError = input.holiday_date ? "" : "Holiday date is required.";
    const nextNameError = input.name.trim() ? "" : "Holiday name is required.";

    setDateError(nextDateError);
    setNameError(nextNameError);

    if (nextDateError || nextNameError) {
      return;
    }

    setSaving(true);
    setSubmitError("");

    try {
      const holiday = await ticketApi.addHolidayDate(input);
      onSave(holiday);
      onClose();
    } catch (err) {
      console.error(err);
      setSubmitError(
        err instanceof Error ? err.message : "Unable to add holiday.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Holiday</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25} sx={{ pt: 0.5 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          <DateField
            inputRef={dateInputRef}
            name="holiday_date"
            label="Holiday Date"
            value={input.holiday_date}
            onValueChange={(value) => {
              setInput((prev) => ({ ...prev, holiday_date: value }));
              setDateError("");
              setSubmitError("");
            }}
            error={Boolean(dateError)}
            helperText={dateError || " "}
            required
            fullWidth
            size="small"
          />
          <TextField
            name="name"
            label="Holiday Name"
            value={input.name}
            onChange={handleChange}
            error={Boolean(nameError)}
            helperText={nameError || " "}
            required
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

export default HolidayAddDialog;
