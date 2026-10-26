import React from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import type { Ticket } from "../../../../../shared/models/ticket.model";
import { getTicketPickupAmount } from "../../../../../shared/utils/ticketFinance";
import ClientBar from "../../../shared/components/ClientBar";
import { formatCurrency } from "../../../shared/utils/formatters";

interface ReverseTicketDialogProps {
  ticket: Ticket;
  clientFirstName?: string;
  clientLastName?: string;
  clientMiddleName?: string;
  error: string;
  processing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ReverseTicketDialog: React.FC<ReverseTicketDialogProps> = ({
  ticket,
  clientFirstName,
  clientLastName,
  clientMiddleName,
  error,
  processing,
  onClose,
  onConfirm,
}) => {
  const pickupAmount = getTicketPickupAmount(ticket);

  return (
    <Dialog
      open
      onClose={processing ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Reverse Ticket</DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}
      >
        {error && <Alert severity="warning">{error}</Alert>}
        <ClientBar
          client_first_name={clientFirstName}
          client_last_name={clientLastName}
          client_middle_name={clientMiddleName}
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 1,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Ticket #
            </Typography>
            <Typography fontWeight={700}>{ticket.ticket_number}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Location
            </Typography>
            <Typography fontWeight={700}>{ticket.location}</Typography>
          </Box>
          <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              Description
            </Typography>
            <Typography fontWeight={700} sx={{ overflowWrap: "anywhere" }}>
              {ticket.description}
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            px: 1.5,
            py: 1,
            backgroundColor: "#fce4ec",
            border: "1px solid rgba(216, 27, 96, 0.28)",
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography fontWeight={800}>Pickup Amount</Typography>
          <Typography fontWeight={900} variant="h6">
            {formatCurrency(pickupAmount)}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onConfirm} variant="contained" disabled={processing}>
          {processing ? "Reversing..." : "Reverse"}
        </Button>
        <Button onClick={onClose} disabled={processing}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReverseTicketDialog;
