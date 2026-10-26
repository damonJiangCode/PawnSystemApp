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

type ColorAddDialogProps = {
  open: boolean;
  colorType: string;
  onClose: () => void;
  onAdd: (color: string) => Promise<string>;
  onSave: (color: string) => void;
  uppercase?: boolean;
};

const ColorAddDialog: React.FC<ColorAddDialogProps> = ({
  open,
  colorType,
  onClose,
  onAdd,
  onSave,
  uppercase = false,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [color, setColor] = React.useState("");
  const [colorError, setColorError] = React.useState("");
  const [submitError, setSubmitError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setColor("");
    setColorError("");
    setSubmitError("");
    setSaving(false);

    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const handleAdd = async () => {
    const normalizedColor = color.trim();

    if (!normalizedColor) {
      setColorError(`${colorType} color is required.`);
      return;
    }

    setSaving(true);
    setSubmitError("");

    try {
      const savedColor = await onAdd(normalizedColor);
      onSave(savedColor);
      onClose();
    } catch (err) {
      console.error(err);
      setSubmitError(
        err instanceof Error
          ? err.message
          : `Unable to add ${colorType} color.`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add {colorType} Color</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25} sx={{ pt: 0.5 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          <TextField
            inputRef={inputRef}
            label={`${colorType} Color`}
            value={color}
            onChange={(event) => {
              setColor(
                uppercase
                  ? event.target.value.toUpperCase()
                  : event.target.value,
              );
              setColorError("");
              setSubmitError("");
            }}
            error={Boolean(colorError)}
            helperText={colorError || " "}
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

export default ColorAddDialog;
