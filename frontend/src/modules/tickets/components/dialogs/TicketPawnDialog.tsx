import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Autocomplete,
  Box,
  Alert,
} from "@mui/material";
import type { CreatePawnTicketInput, TicketFormError } from "../../ticket.api";
import { calculation } from "../../../../../../shared/utils/calculation";
import { resolveFormFieldError } from "../../../../shared/utils/formError";
import { confirmZeroTicketAmount } from "./confirmZeroTicketAmount";
import { preventNumberInputWheel } from "./preventNumberInputWheel";
import { referenceApi } from "../../../reference/reference.api";

interface TicketPawnDialogProps {
  open: boolean;
  clientLastName: string;
  clientFirstName: string;
  clientMiddleName?: string;
  dialogTitle?: string;
  saveLabel?: string;
  initialValues?: Partial<
    Pick<
      CreatePawnTicketInput,
      "description" | "location" | "amount" | "onetime_fee"
    >
  >;
  onClose: () => void;
  onSave: (
    ticketData: Omit<CreatePawnTicketInput, "client_number">,
  ) => Promise<void>;
}

const TicketPawnDialog: React.FC<TicketPawnDialogProps> = (props) => {
  const {
    open,
    clientLastName,
    clientFirstName,
    clientMiddleName,
    dialogTitle = "Pawn Ticket",
    saveLabel = "Add",
    initialValues,
    onClose,
    onSave,
  } = props;
  const formattedClientName = [clientFirstName, clientMiddleName]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.toUpperCase())
    .join(" ");

  const descriptionRef = useRef<HTMLInputElement>(null);
  const employeePasswordRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [locationList, setLocationList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number | "">("");
  const [oneTimeFee, setOneTimeFee] = useState<number | "">("");
  const [employeePassword, setEmployeePassword] = useState<string | "">("");
  const [earlyClaimAmount, setEarlyClaimAmount] = useState(0);
  const [pickupAmount, setPickupAmount] = useState(0);
  const [descriptionError, setDescriptionError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [oneTimeFeeError, setOneTimeFeeError] = useState("");
  const [employeePasswordError, setEmployeePasswordError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const compactFieldSx = {
    "& .MuiFormHelperText-root": {
      mt: 0.25,
      minHeight: 16,
      lineHeight: 1.2,
    },
  };

  const focusEmployeePassword = () => {
    requestAnimationFrame(() => {
      employeePasswordRef.current?.focus();
      employeePasswordRef.current?.select();
    });
  };

  useEffect(() => {
    let active = true;

    const fetchLocations = async () => {
      setLoading(true);
      try {
        const locations = await referenceApi.loadLocations();

        if (active) {
          setLocationList(locations);
        }
      } catch (err) {
        if (active) {
          console.error("Failed to load locations", err);
          setSubmitError(
            err instanceof Error ? err.message : "Unable to load locations.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchLocations();

    return () => {
      active = false;
    };
  }, []);

  // focus on description input
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      descriptionRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // initialize states
  useEffect(() => {
    if (!open) {
      return;
    }

    setDescription(initialValues?.description ?? "");
    setLocation(initialValues?.location ?? "");
    setAmount(initialValues?.amount ?? "");
    setOneTimeFee(initialValues?.onetime_fee ?? "");
    setEmployeePassword("");
    setDescriptionError("");
    setLocationError("");
    setAmountError("");
    setOneTimeFeeError("");
    setEmployeePasswordError("");
    setSubmitError("");
    setSaving(false);
  }, [open, initialValues]);

  // render pickup amounts
  useEffect(() => {
    const amt = typeof amount === "number" ? amount : 0;
    const fee = typeof oneTimeFee === "number" ? oneTimeFee : 0;
    setEarlyClaimAmount(calculation.getEarlyAmt(amt, fee));
    setPickupAmount(calculation.getBasePickupAmt(amt, fee));
  }, [amount, oneTimeFee]);

  // handle save button clicked
  const handleSave = async () => {
    const trimmedDescription = description.trim();
    const trimmedLocation = location.trim();
    const trimmedPassword = employeePassword.trim();
    const isValidLocation = locationList.includes(trimmedLocation);
    const nextDescriptionError =
      trimmedDescription.length === 0 ? "Description is required." : "";
    const nextLocationError =
      trimmedLocation.length === 0
        ? "Location is required."
        : !isValidLocation
          ? "Select a valid location from the list."
          : "";
    const nextAmountError =
      typeof amount !== "number" || !Number.isFinite(amount) || amount < 0
        ? "Amount cannot be negative."
        : "";
    const nextOneTimeFeeError =
      oneTimeFee !== "" && (!Number.isFinite(oneTimeFee) || oneTimeFee < 0)
        ? "One Time Fee cannot be negative."
        : "";
    const nextEmployeePasswordError =
      trimmedPassword.length === 0 ? "Enter employee password." : "";

    setDescriptionError(nextDescriptionError);
    setLocationError(nextLocationError);
    setAmountError(nextAmountError);
    setOneTimeFeeError(nextOneTimeFeeError);
    setEmployeePasswordError(nextEmployeePasswordError);
    setSubmitError("");

    if (
      nextDescriptionError ||
      nextLocationError ||
      nextAmountError ||
      nextOneTimeFeeError ||
      nextEmployeePasswordError
    ) {
      if (nextEmployeePasswordError) {
        focusEmployeePassword();
      }
      return;
    }

    const normalizedAmount = amount as number;
    if (!confirmZeroTicketAmount(normalizedAmount)) {
      return;
    }

    setSaving(true);

    try {
      await onSave({
        description: trimmedDescription,
        location: trimmedLocation,
        amount: normalizedAmount,
        onetime_fee: typeof oneTimeFee === "number" ? oneTimeFee : 0,
        employee_password: trimmedPassword,
      });
    } catch (err) {
      console.error(err);
      const formError = err as TicketFormError;

      const nextEmployeePasswordError = resolveFormFieldError(
        "employee_password",
        formError,
      );

      if (nextEmployeePasswordError) {
        setEmployeePasswordError(nextEmployeePasswordError);
        focusEmployeePassword();
        return;
      }

      setSubmitError("Couldn't pawn this ticket right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{dialogTitle}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
          }}
        >
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <TextField
            label="Client"
            value={`${clientLastName.toUpperCase()}, ${formattedClientName}`}
            disabled
            fullWidth
            size="small"
            sx={{
              ...compactFieldSx,
              mt: 0.75,
              mb: 2,
              "& .MuiInputBase-input.Mui-disabled": {
                WebkitTextFillColor: "text.primary",
              },
            }}
          />

          <TextField
            inputRef={descriptionRef}
            label="Description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value.toUpperCase().slice(0, 15));
              if (submitError) {
                setSubmitError("");
              }
              if (descriptionError) {
                setDescriptionError("");
              }
            }}
            fullWidth
            required
            size="small"
            error={Boolean(descriptionError)}
            helperText={descriptionError || " "}
            sx={compactFieldSx}
          />

          <Autocomplete
            value={location}
            onChange={(_event, newValue) => {
              setLocation(newValue || "");
              if (submitError) {
                setSubmitError("");
              }
              if (locationError) {
                setLocationError("");
              }
            }}
            options={locationList}
            disabled={loading}
            onInputChange={(_event, inputValue, reason) => {
              if (reason === "input") {
                const transformed = inputValue.replace(/[a-z]/g, (c) =>
                  c.toUpperCase(),
                );
                setLocation(transformed);
                if (submitError) {
                  setSubmitError("");
                }
                if (locationError) {
                  setLocationError("");
                }
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Location"
                required
                fullWidth
                size="small"
                error={Boolean(locationError)}
                helperText={locationError || " "}
                sx={compactFieldSx}
              />
            )}
          />

          <TextField
            label="Amount"
            type="number"
            value={amount}
            slotProps={{
              htmlInput: {
                onWheel: preventNumberInputWheel,
              },
            }}
            onChange={(e) => {
              const nextValue = e.target.value;
              setAmount(nextValue === "" ? "" : Number(nextValue));
              if (submitError) {
                setSubmitError("");
              }
              if (amountError) {
                setAmountError("");
              }
            }}
            fullWidth
            required
            size="small"
            error={Boolean(amountError)}
            helperText={amountError || " "}
            sx={compactFieldSx}
          />

          <TextField
            inputRef={employeePasswordRef}
            label="Employee Password"
            value={employeePassword}
            onChange={(e) => {
              setEmployeePassword(e.target.value);
              if (submitError) {
                setSubmitError("");
              }
              if (employeePasswordError) {
                setEmployeePasswordError("");
              }
            }}
            fullWidth
            required
            type="password"
            size="small"
            error={Boolean(employeePasswordError)}
            helperText={employeePasswordError || " "}
            sx={compactFieldSx}
          />

          <TextField
            label="One Time Fee"
            type="number"
            value={oneTimeFee}
            slotProps={{
              htmlInput: {
                onWheel: preventNumberInputWheel,
                tabIndex: -1,
              },
            }}
            onChange={(e) => {
              const nextValue = e.target.value;
              setOneTimeFee(nextValue === "" ? "" : Number(nextValue));
              if (submitError) {
                setSubmitError("");
              }
              if (oneTimeFeeError) {
                setOneTimeFeeError("");
              }
            }}
            fullWidth
            size="small"
            error={Boolean(oneTimeFeeError)}
            helperText={oneTimeFeeError || " "}
            sx={compactFieldSx}
          />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 1,
            }}
          >
            <TextField
              label="Early Claim Amount"
              value={earlyClaimAmount.toFixed(2)}
              disabled
              fullWidth
              size="small"
              sx={compactFieldSx}
            />

            <TextField
              label="Pickup Amount"
              value={pickupAmount.toFixed(2)}
              disabled
              fullWidth
              size="small"
              sx={compactFieldSx}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saveLabel}
        </Button>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TicketPawnDialog;
