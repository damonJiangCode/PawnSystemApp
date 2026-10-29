import DateField from "../../../shared/components/DateField";
import React from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import type { Employee } from "../../../../../shared/models/employee.model";
import {
  employeeApi,
  type CreateEmployeeInput,
  type EmployeeFormError,
} from "../employee.api";

type EmployeeFormErrors = Record<keyof CreateEmployeeInput, string>;

type EmployeeAddEditDialogProps = {
  open: boolean;
  mode?: "add" | "edit";
  initialEmployee?: Employee | null;
  onClose: () => void;
  onSave?: (employee: Employee) => void;
};

const emptyEmployeeInput = (): CreateEmployeeInput => ({
  first_name: "",
  last_name: "",
  nickname: "",
  date_of_birth: "",
  gender: "",
  password: "",
  manager_password: "",
  is_terminated: false,
  is_manager: false,
  address: "",
  phone: "",
  email: "",
});

const emptyErrors = (): EmployeeFormErrors => ({
  first_name: "",
  last_name: "",
  nickname: "",
  date_of_birth: "",
  gender: "",
  password: "",
  manager_password: "",
  is_terminated: "",
  is_manager: "",
  address: "",
  phone: "",
  email: "",
});

const employeeToInput = (employee: Employee): CreateEmployeeInput => ({
  first_name: employee.first_name,
  last_name: employee.last_name,
  nickname: employee.nickname,
  date_of_birth: employee.date_of_birth,
  gender: employee.gender,
  password: "",
  manager_password: "",
  is_terminated: employee.is_terminated,
  is_manager: employee.is_manager,
  address: employee.address,
  phone: employee.phone,
  email: employee.email,
});

const getDateOfBirthError = (dateOfBirth: string) => {
  if (!dateOfBirth.trim()) {
    return "Date of birth is required.";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return "Enter a complete date of birth.";
  }

  const parsed = new Date(`${dateOfBirth}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "Enter a valid date of birth.";
  }

  const normalized = parsed.toISOString().slice(0, 10);

  if (normalized !== dateOfBirth) {
    return "Enter a valid date of birth.";
  }

  return "";
};

const EmployeeAddEditDialog: React.FC<EmployeeAddEditDialogProps> = ({
  open,
  mode = "add",
  initialEmployee,
  onClose,
  onSave,
}) => {
  const lastNameInputRef = React.useRef<HTMLInputElement>(null);
  const employeePasswordInputRef = React.useRef<HTMLInputElement>(null);
  const managerPasswordInputRef = React.useRef<HTMLInputElement>(null);
  const [employee, setEmployee] =
    React.useState<CreateEmployeeInput>(emptyEmployeeInput());
  const [errors, setErrors] = React.useState<EmployeeFormErrors>(emptyErrors());
  const [submitError, setSubmitError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setEmployee(
      mode === "edit" && initialEmployee
        ? employeeToInput(initialEmployee)
        : emptyEmployeeInput(),
    );
    setErrors(emptyErrors());
    setSubmitError("");
    setSaving(false);

    const frame = requestAnimationFrame(() => {
      lastNameInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [initialEmployee, mode, open]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, type, value } = event.target;
    const shouldUppercase =
      name === "last_name" || name === "first_name" || name === "nickname";
    const nextValue =
      type === "checkbox"
        ? (event.target as HTMLInputElement).checked
        : shouldUppercase
          ? value.toUpperCase()
          : value;
    setEmployee((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitError("");
  };

  const validate = () => {
    const nextErrors = emptyErrors();

    if (!employee.last_name.trim()) {
      nextErrors.last_name = "Last name is required.";
    }

    if (!employee.first_name.trim()) {
      nextErrors.first_name = "First name is required.";
    }

    nextErrors.date_of_birth = getDateOfBirthError(employee.date_of_birth);

    if (!employee.gender.trim()) {
      nextErrors.gender = "Gender is required.";
    }

    if (mode === "add" && !employee.password.trim()) {
      nextErrors.password = "Password is required.";
    }

    if (!employee.manager_password.trim()) {
      nextErrors.manager_password = "Manager password is required.";
    }

    setErrors(nextErrors);
    const isValid = !Object.values(nextErrors).some(Boolean);

    if (!isValid && nextErrors.manager_password) {
      requestAnimationFrame(() => {
        managerPasswordInputRef.current?.focus();
      });
    }

    return isValid;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setSaving(true);
    setSubmitError("");

    try {
      const savedEmployee =
        mode === "edit" && initialEmployee
          ? await employeeApi.updateEmployee(
              initialEmployee.employee_number,
              employee,
            )
          : await employeeApi.createEmployee(employee);

      onSave?.(savedEmployee);
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unable to save employee.";
      const errorField = (err as EmployeeFormError)?.field;

      if (errorField && errorField !== "form") {
        setSubmitError("");
        setErrors((current) => ({
          ...current,
          [errorField]: errorMessage,
        }));

        requestAnimationFrame(() => {
          if (errorField === "password") {
            employeePasswordInputRef.current?.focus();
            employeePasswordInputRef.current?.select();
          }

          if (errorField === "manager_password") {
            managerPasswordInputRef.current?.focus();
            managerPasswordInputRef.current?.select();
          }
        });
        return;
      }

      setSubmitError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "edit" ? "Edit Employee" : "Add Employee";
  const saveLabel = mode === "edit" ? "Update" : "Add";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25} sx={{ pt: 0.5 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <Stack direction="row" spacing={1}>
            <TextField
              inputRef={lastNameInputRef}
              name="last_name"
              label="Last Name"
              value={employee.last_name.toLocaleUpperCase()}
              onChange={handleChange}
              error={Boolean(errors.last_name)}
              helperText={errors.last_name || " "}
              required
              fullWidth
              size="small"
            />
            <TextField
              name="first_name"
              label="First Name"
              value={employee.first_name.toUpperCase()}
              onChange={handleChange}
              error={Boolean(errors.first_name)}
              helperText={errors.first_name || " "}
              required
              fullWidth
              size="small"
            />
          </Stack>

          <TextField
            name="nickname"
            label="Nickname"
            value={employee.nickname}
            onChange={handleChange}
            helperText=" "
            fullWidth
            size="small"
          />

          <Stack direction="row" spacing={1}>
            <DateField
              name="date_of_birth"
              label="Date of Birth"
              value={employee.date_of_birth}
              onValueChange={(value) => {
                setEmployee((prev) => ({ ...prev, date_of_birth: value }));
                setErrors((prev) => ({ ...prev, date_of_birth: "" }));
                setSubmitError("");
              }}
              error={Boolean(errors.date_of_birth)}
              helperText={errors.date_of_birth || " "}
              required
              fullWidth
              size="small"
            />
            <TextField
              select
              name="gender"
              label="Gender"
              value={employee.gender}
              onChange={handleChange}
              error={Boolean(errors.gender)}
              helperText={errors.gender || " "}
              required
              fullWidth
              size="small"
            >
              <MenuItem value=""></MenuItem>
              <MenuItem value="male">MALE</MenuItem>
              <MenuItem value="female">FEMALE</MenuItem>
              <MenuItem value="unknown">UNKNOWN</MenuItem>
            </TextField>
          </Stack>

          <TextField
            inputRef={employeePasswordInputRef}
            name="password"
            type="password"
            label={mode === "edit" ? "New Password" : "Password"}
            value={employee.password}
            onChange={handleChange}
            error={Boolean(errors.password)}
            helperText={errors.password || " "}
            required={mode === "add"}
            fullWidth
            size="small"
          />

          <TextField
            inputRef={managerPasswordInputRef}
            name="manager_password"
            type="password"
            label="Manager Password"
            value={employee.manager_password}
            onChange={handleChange}
            error={Boolean(errors.manager_password)}
            helperText={errors.manager_password || " "}
            required
            fullWidth
            size="small"
            autoComplete="off"
          />

          <Stack direction="row" spacing={2}>
            <FormControlLabel
              control={
                <Checkbox
                  name="is_manager"
                  checked={employee.is_manager}
                  onChange={handleChange}
                />
              }
              label="Manager"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="is_terminated"
                  checked={employee.is_terminated}
                  onChange={handleChange}
                />
              }
              label="Terminated"
            />
          </Stack>

          <TextField
            name="address"
            label="Address"
            value={employee.address}
            onChange={handleChange}
            helperText=" "
            fullWidth
            multiline
            minRows={2}
            size="small"
          />

          <Stack direction="row" spacing={1}>
            <TextField
              name="phone"
              label="Phone"
              value={employee.phone}
              onChange={handleChange}
              helperText=" "
              fullWidth
              size="small"
            />
            <TextField
              name="email"
              label="Email"
              value={employee.email}
              onChange={handleChange}
              helperText=" "
              fullWidth
              size="small"
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? "Saving..." : saveLabel}
        </Button>
        <Button onClick={onClose} disabled={saving}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmployeeAddEditDialog;
