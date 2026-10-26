import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import type {
  TicketFormError,
  TransferTicketPreview,
} from "../../ticket.api";
import { resolveFormFieldError } from "../../../../shared/utils/formError";

interface TicketTransferDialogProps {
  open: boolean;
  clientLastName: string;
  clientFirstName: string;
  clientMiddleName?: string;
  clientNumber?: number;
  onClose: () => void;
  onLoadPreview: (
    ticketNumber: number,
  ) => Promise<TransferTicketPreview | null>;
  onTransfer: (ticketNumber: number) => Promise<void>;
}

const TicketTransferDialog: React.FC<TicketTransferDialogProps> = (props) => {
  const {
    open,
    clientLastName,
    clientFirstName,
    clientMiddleName,
    clientNumber,
    onClose,
    onLoadPreview,
    onTransfer,
  } = props;
  const ticketNumberRef = useRef<HTMLInputElement>(null);
  const formattedClientName = [clientFirstName, clientMiddleName]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.toUpperCase())
    .join(" ");

  const [ticketNumber, setTicketNumber] = useState<number | "">("");
  const [ticketNumberError, setTicketNumberError] = useState("");
  const [preview, setPreview] = useState<TransferTicketPreview | null>(null);
  const [loadedTicketNumber, setLoadedTicketNumber] = useState<number | null>(
    null,
  );
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const isTransferable =
    !!preview &&
    (preview.status === "pawned" || preview.status === "sold") &&
    preview.previous_client_number !== clientNumber;

  useEffect(() => {
    if (!open) {
      return;
    }

    const id = requestAnimationFrame(() => {
      ticketNumberRef.current?.focus();
    });

    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTicketNumber("");
    setTicketNumberError("");
    setPreview(null);
    setLoadedTicketNumber(null);
    setLoadingPreview(false);
    setTransferring(false);
    setSubmitError("");
  }, [open]);

  const validateTicketNumber = (): number | null => {
    const normalizedTicketNumber =
      typeof ticketNumber === "number" ? Math.trunc(ticketNumber) : NaN;
    const nextTicketNumberError =
      !Number.isFinite(normalizedTicketNumber) || normalizedTicketNumber <= 0
        ? "Enter a valid ticket number."
        : "";

    setTicketNumberError(nextTicketNumberError);

    if (nextTicketNumberError) {
      return null;
    }

    return normalizedTicketNumber;
  };

  const handleLoadPreview = async () => {
    const normalizedTicketNumber = validateTicketNumber();

    setSubmitError("");
    setPreview(null);
    setLoadedTicketNumber(null);

    if (!normalizedTicketNumber) {
      return;
    }

    setLoadingPreview(true);

    try {
      const nextPreview = await onLoadPreview(normalizedTicketNumber);

      if (!nextPreview) {
        setTicketNumberError("No ticket was found for that ticket number.");
        return;
      }

      setPreview(nextPreview);
      setLoadedTicketNumber(normalizedTicketNumber);
    } catch (error) {
      const formError = error as TicketFormError;
      const nextTicketNumberError = resolveFormFieldError(
        "ticket_number",
        formError,
      );

      if (nextTicketNumberError) {
        setTicketNumberError(nextTicketNumberError);
        return;
      }

      setSubmitError("Couldn't load that ticket right now. Please try again.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleTransfer = async () => {
    const normalizedTicketNumber = validateTicketNumber();

    setSubmitError("");

    if (!normalizedTicketNumber) {
      return;
    }

    if (loadedTicketNumber !== normalizedTicketNumber || !preview) {
      setTicketNumberError("Load the ticket first before transferring it.");
      return;
    }

    if (!isTransferable) {
      setTicketNumberError(
        preview?.previous_client_number === clientNumber
          ? "This ticket already belongs to the selected client."
          : "Only pawned or sold tickets can be transferred.",
      );
      return;
    }

    setTransferring(true);

    try {
      await onTransfer(normalizedTicketNumber);
    } catch (error) {
      const formError = error as TicketFormError;
      const nextTicketNumberError = resolveFormFieldError(
        "ticket_number",
        formError,
      );

      if (nextTicketNumberError) {
        setTicketNumberError(nextTicketNumberError);
        return;
      }

      setSubmitError(
        "Couldn't transfer this ticket right now. Please try again.",
      );
    } finally {
      setTransferring(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Transfer Ticket</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <TextField
            label="Current Client"
            value={`${clientLastName.toUpperCase()}, ${formattedClientName}`}
            disabled
            fullWidth
          />

          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
            <TextField
              inputRef={ticketNumberRef}
              label="Ticket Number"
              type="number"
              value={ticketNumber}
              onChange={(event) => {
                const nextValue = event.target.value;
                setTicketNumber(nextValue === "" ? "" : Number(nextValue));
                setTicketNumberError("");
                setSubmitError("");
                setPreview(null);
                setLoadedTicketNumber(null);
              }}
              fullWidth
              required
              error={Boolean(ticketNumberError)}
              helperText={ticketNumberError || " "}
            />
            <Button
              variant="outlined"
              onClick={handleLoadPreview}
              disabled={loadingPreview || transferring}
              sx={{ minWidth: 96, mt: 0.5 }}
            >
              {loadingPreview ? "Load..." : "Load"}
            </Button>
          </Box>

          {preview && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                p: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                backgroundColor: "grey.50",
              }}
            >
              <TextField
                label="Previous Owner"
                value={preview.previous_client_name}
                disabled
                fullWidth
              />
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <TextField
                  label="Status"
                  value={String(preview.status).toUpperCase()}
                  disabled
                  fullWidth
                />
                <TextField
                  label="Location"
                  value={preview.location}
                  disabled
                  fullWidth
                />
              </Box>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <TextField
                  label="Description"
                  value={preview.description}
                  disabled
                  fullWidth
                />
                <TextField
                  label="Amount"
                  value={preview.amount.toFixed(2)}
                  disabled
                  fullWidth
                />
              </Box>
              {!isTransferable && (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  {preview.previous_client_number === clientNumber
                    ? "This ticket already belongs to the selected client."
                    : "Only pawned or sold tickets can be transferred."}
                </Alert>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleTransfer}
          variant="contained"
          disabled={transferring || loadingPreview}
        >
          {transferring ? "Transferring..." : "Transfer"}
        </Button>
        <Button onClick={onClose} disabled={transferring}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TicketTransferDialog;
