import React, { useEffect, useRef, useState } from "react";
import {
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  FormControlLabel,
} from "@mui/material";
import type { Ticket } from "../../../../../../shared/models/ticket.model";
import type {
  TicketFormError,
  TicketFormField,
  UpdateTicketInput,
} from "../../ticket.api";
import { calculation } from "../../../../../../shared/utils/calculation";
import Autocomplete from "@mui/material/Autocomplete";
import { resolveFormFieldError } from "../../../../shared/utils/formError";
import ConfirmDialog from "../../../../shared/components/ConfirmDialog";
import { preventNumberInputWheel } from "./preventNumberInputWheel";
import { referenceApi } from "../../../reference/reference.api";

interface TicketEditDialogProps {
  open: boolean;
  ticket: Ticket | null;
  clientLastName: string;
  clientFirstName: string;
  clientMiddleName?: string;
  onClose: () => void;
  onSave: (ticketData: UpdateTicketInput) => Promise<void>;
}

const TicketEditDialog: React.FC<TicketEditDialogProps> = (props) => {
  const {
    open,
    ticket,
    clientLastName,
    clientFirstName,
    clientMiddleName,
    onClose,
    onSave,
  } = props;
  const isPawnedTicket = ticket?.status === "pawned";
  const formattedClientName = [clientFirstName, clientMiddleName]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.toUpperCase())
    .join(" ");
  const amountRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [isLost, setIsLost] = useState(false);
  const [location, setLocation] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [oneTimeFee, setOneTimeFee] = useState<number | "">("");
  const [employeePassword, setEmployeePassword] = useState("");
  const [locationList, setLocationList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [earlyClaimAmount, setEarlyClaimAmount] = useState(0);
  const [pickupAmount, setPickupAmount] = useState(0);
  const [descriptionError, setDescriptionError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [oneTimeFeeError, setOneTimeFeeError] = useState("");
  const [employeePasswordError, setEmployeePasswordError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmZeroOpen, setConfirmZeroOpen] = useState(false);
  const compactFieldSx = {
    "& .MuiFormHelperText-root": {
      mt: 0.25,
      lineHeight: 1.2,
    },
  };
  const disabledFieldSx = {
    ...compactFieldSx,
    "& .MuiInputBase-input.Mui-disabled": {
      WebkitTextFillColor: "text.primary",
    },
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

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      amountRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open || !ticket) return;
    setDescription(ticket.description || "");
    setIsLost(Boolean(ticket.is_lost));
    setLocation(ticket.location || "");
    setAmount(ticket.amount ?? "");
    setOneTimeFee(ticket.onetime_fee ?? "");
    setEmployeePassword("");
    setDescriptionError("");
    setLocationError("");
    setAmountError("");
    setOneTimeFeeError("");
    setEmployeePasswordError("");
    setConfirmZeroOpen(false);
    setSubmitError("");
    setSaving(false);
  }, [open, ticket]);

  useEffect(() => {
    const nextAmount = typeof amount === "number" ? amount : 0;
    const nextFee = typeof oneTimeFee === "number" ? oneTimeFee : 0;
    setEarlyClaimAmount(calculation.getEarlyAmt(nextAmount, nextFee));
    setPickupAmount(calculation.getBasePickupAmt(nextAmount, nextFee));
  }, [amount, oneTimeFee]);

  // A $0 pawn is valid only for special records, so it needs confirmation.
  const handleSave = async (zeroAmountConfirmed = false) => {
    if (!ticket) return;

    const trimmedDescription = description.trim();
    const trimmedLocation = location.trim();
    const trimmedPassword = employeePassword.trim();
    const isValidLocation =
      locationList.includes(trimmedLocation) ||
      trimmedLocation === ticket.location?.trim();
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
        : !isPawnedTicket && amount === 0
          ? "Amount must be greater than 0."
          : "";
    const nextOneTimeFeeError =
      isPawnedTicket &&
      oneTimeFee !== "" &&
      (!Number.isFinite(oneTimeFee) || oneTimeFee < 0)
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
      return;
    }

    const normalizedAmount = amount as number;
    if (normalizedAmount === 0 && !zeroAmountConfirmed) {
      setConfirmZeroOpen(true);
      return;
    }
    setSaving(true);

    try {
      await onSave({
        ticket_number: ticket.ticket_number as number,
        is_lost: isLost,
        description: trimmedDescription,
        location: trimmedLocation,
        amount: normalizedAmount,
        onetime_fee:
          isPawnedTicket && typeof oneTimeFee === "number" ? oneTimeFee : 0,
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
        return;
      }

      // Server field errors go under their input; other request errors keep
      // the server's message, unexpected failures get a generic one.
      const fieldErrorSetters: Partial<
        Record<TicketFormField, (message: string) => void>
      > = {
        description: setDescriptionError,
        location: setLocationError,
        amount: setAmountError,
        onetime_fee: setOneTimeFeeError,
      };
      const setFieldError = formError.field
        ? fieldErrorSetters[formError.field]
        : undefined;
      if (setFieldError) {
        setFieldError(formError.message);
        return;
      }

      setSubmitError(
        formError.status !== undefined && formError.status < 500
          ? formError.message
          : "Couldn't update this ticket right now. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Edit Ticket</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <TextField
            label="Client"
            value={`${clientLastName.toUpperCase()}, ${formattedClientName}`}
            disabled
            fullWidth
            size="small"
            sx={{ ...disabledFieldSx, mt: 0.75 }}
          />
          <TextField
            label="Ticket #"
            value={ticket?.ticket_number ?? ""}
            disabled
            fullWidth
            size="small"
            sx={disabledFieldSx}
          />
          {isPawnedTicket && (
            <FormControlLabel
              sx={{
                my: -0.5,
                alignSelf: "center",
                color: "error.main",
                "& .MuiFormControlLabel-label": {
                  fontSize: 15,
                },
              }}
              control={
                <Checkbox
                  size="small"
                  sx={{
                    p: 0.5,
                    color: "error.main",
                    "&.Mui-checked": {
                      color: "error.main",
                    },
                    "& .MuiSvgIcon-root": {
                      fontSize: 18,
                    },
                  }}
                  checked={isLost}
                  onChange={(_event, checked) => {
                    setIsLost(checked);
                  }}
                />
              }
              label="Lost Ticket"
            />
          )}
          <TextField
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
            helperText={descriptionError || undefined}
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
            options={
              ticket?.location && !locationList.includes(ticket.location)
                ? [...locationList, ticket.location]
                : locationList
            }
            getOptionDisabled={(option) => !locationList.includes(option)}
            renderOption={(props, option) => (
              <li {...props}>
                {option}
                {!locationList.includes(option) &&
                  " (unavailable for new selections)"}
              </li>
            )}
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
                helperText={locationError || undefined}
                sx={compactFieldSx}
              />
            )}
          />
          <TextField
            inputRef={amountRef}
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
            autoFocus
            size="small"
            error={Boolean(amountError)}
            helperText={amountError || undefined}
            sx={compactFieldSx}
          />

          <TextField
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
            helperText={employeePasswordError || undefined}
            sx={compactFieldSx}
          />

          {isPawnedTicket && (
            <>
              <TextField
                label="One Time Fee"
                type="number"
                value={oneTimeFee}
                slotProps={{
                  htmlInput: {
                    tabIndex: -1,
                    onWheel: preventNumberInputWheel,
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
                helperText={oneTimeFeeError || undefined}
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
                  sx={disabledFieldSx}
                />
                <TextField
                  label="Pickup Amount"
                  value={pickupAmount.toFixed(2)}
                  disabled
                  fullWidth
                  size="small"
                  sx={disabledFieldSx}
                />
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={!ticket || saving}
        >
          Update
        </Button>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
      </DialogActions>
      <ConfirmDialog
        open={confirmZeroOpen}
        title="Save $0 pawn?"
        message="Ticket amount is 0. This is usually only for special records such as signature-only tickets. Continue?"
        confirmLabel="Continue"
        confirmColor="primary"
        onCancel={() => setConfirmZeroOpen(false)}
        onConfirm={() => {
          setConfirmZeroOpen(false);
          void handleSave(true);
        }}
      />
    </Dialog>
  );
};

export default TicketEditDialog;
