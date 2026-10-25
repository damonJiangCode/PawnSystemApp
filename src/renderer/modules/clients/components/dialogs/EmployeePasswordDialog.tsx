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

type EmployeePasswordDialogProps = {
  open: boolean;
  savingClient: boolean;
  submitError: string;
  employeePassword: string;
  employeePasswordError: string;
  passwordInputRef: React.RefObject<HTMLInputElement>;
  onPasswordChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  onClose: () => void;
};

const EmployeePasswordDialog: React.FC<EmployeePasswordDialogProps> = ({
  open,
  savingClient,
  submitError,
  employeePassword,
  employeePasswordError,
  passwordInputRef,
  onPasswordChange,
  onCancel,
  onConfirm,
  onClose,
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
    <DialogTitle>Employee password</DialogTitle>
    <DialogContent>
      {submitError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {submitError}
        </Alert>
      )}
      <TextField
        inputRef={passwordInputRef}
        fullWidth
        type="password"
        label="Employee password"
        value={employeePassword}
        disabled={savingClient}
        onChange={(event) => onPasswordChange(event.target.value)}
        sx={{ mt: 1 }}
        error={Boolean(employeePasswordError)}
        helperText={employeePasswordError || " "}
      />
    </DialogContent>
    <DialogActions>
      <Button
        style={{ textTransform: "none" }}
        onClick={onCancel}
        disabled={savingClient}
      >
        Cancel
      </Button>
      <Button
        style={{ textTransform: "none" }}
        onClick={onConfirm}
        variant="contained"
        disabled={savingClient}
      >
        {savingClient ? "Saving..." : "Confirm"}
      </Button>
    </DialogActions>
  </Dialog>
);

export default EmployeePasswordDialog;
