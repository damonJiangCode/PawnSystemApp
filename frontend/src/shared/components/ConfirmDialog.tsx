import {
  Button,
  type ButtonProps,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { useId } from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: ButtonProps["color"];
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmColor = "error",
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      fullWidth
      maxWidth="xs"
      aria-labelledby={titleId}
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent>{message}</DialogContent>
      <DialogActions>
        <Button
          autoFocus
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          sx={{ textTransform: "none" }}
        >
          {confirmLabel}
        </Button>
        <Button onClick={onCancel} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
