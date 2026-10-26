import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import type { CreateSellTicketInput, TicketFormError } from "../../ticket.api";
import { ticketApi } from "../../ticket.api";
import { resolveFormFieldError } from "../../../../shared/utils/formError";
import { confirmZeroTicketAmount } from "./confirmZeroTicketAmount";
import { preventNumberInputWheel } from "./preventNumberInputWheel";

const DEFAULT_SELL_LOCATION = "BIWK";

interface TicketSellDialogProps {
  open: boolean;
  clientLastName: string;
  clientFirstName: string;
  clientMiddleName?: string;
  onClose: () => void;
  onSave: (
    ticketData: Omit<CreateSellTicketInput, "client_number">,
  ) => Promise<void>;
}

const TicketSellDialog: React.FC<TicketSellDialogProps> = (props) => {
  const {
    open,
    clientLastName,
    clientFirstName,
    clientMiddleName,
    onClose,
    onSave,
  } = props;
  const formattedClientName = [clientFirstName, clientMiddleName]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.toUpperCase())
    .join(" ");

  const descriptionRef = useRef<HTMLInputElement>(null);
  const employeePasswordRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [locationList, setLocationList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number | "">("");
  const [employeePassword, setEmployeePassword] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [employeePasswordError, setEmployeePasswordError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

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
        const locations = await ticketApi.loadLocations();

        if (!active) {
          return;
        }

        setLocationList(locations);
        setLocation((prev) => {
          if (prev.trim()) {
            return prev;
          }

          return locations.includes(DEFAULT_SELL_LOCATION)
            ? DEFAULT_SELL_LOCATION
            : "";
        });
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
      descriptionRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDescription("");
    setLocation(
      locationList.includes(DEFAULT_SELL_LOCATION) ? DEFAULT_SELL_LOCATION : "",
    );
    setAmount("");
    setEmployeePassword("");
    setDescriptionError("");
    setLocationError("");
    setAmountError("");
    setEmployeePasswordError("");
    setSubmitError("");
    setSaving(false);
  }, [locationList, open]);

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
    const nextEmployeePasswordError =
      trimmedPassword.length === 0 ? "Enter employee password." : "";

    setDescriptionError(nextDescriptionError);
    setLocationError(nextLocationError);
    setAmountError(nextAmountError);
    setEmployeePasswordError(nextEmployeePasswordError);
    setSubmitError("");

    if (
      nextDescriptionError ||
      nextLocationError ||
      nextAmountError ||
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

      setSubmitError("Couldn't sell this ticket right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Sell Ticket</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <TextField
            label="Client"
            value={`${clientLastName.toUpperCase()}, ${formattedClientName}`}
            disabled
            fullWidth
            sx={{
              mb: 2,
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
            autoFocus
            error={Boolean(descriptionError)}
            helperText={descriptionError || " "}
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
                error={Boolean(locationError)}
                helperText={locationError || " "}
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
            error={Boolean(amountError)}
            helperText={amountError || " "}
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
            error={Boolean(employeePasswordError)}
            helperText={employeePasswordError || " "}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TicketSellDialog;
