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
    <DialogTitle>Employee Password</DialogTitle>
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
        label="Employee Password"
        value={employeePassword}
        disabled={savingClient}
        onChange={(event) => onPasswordChange(event.target.value)}
        sx={{ mt: 1 }}
        error={Boolean(employeePasswordError)}
        helperText={employeePasswordError || " "}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} disabled={savingClient}>
        Cancel
      </Button>
      <Button onClick={onConfirm} variant="contained" disabled={savingClient}>
        {savingClient ? "Saving..." : "Confirm"}
      </Button>
    </DialogActions>
  </Dialog>
);

export default EmployeePasswordDialog;
