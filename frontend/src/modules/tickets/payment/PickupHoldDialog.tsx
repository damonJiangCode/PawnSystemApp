import React from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import type { PaymentTicketRow } from "./payment.types";

type PickupHoldDialogProps = {
  rows: PaymentTicketRow[];
  onContinue: () => void;
  onClose: () => void;
};

const PickupHoldDialog: React.FC<PickupHoldDialogProps> = ({
  rows,
  onContinue,
  onClose,
}) => (
  <Dialog open={rows.length > 0} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Pickup Hold</DialogTitle>
    <DialogContent dividers>
      <Alert severity="error" variant="outlined" sx={{ mb: 1 }}>
        The required two-business-day hold has not finished.
      </Alert>
      <List dense disablePadding>
        {rows.map((row) => (
          <ListItem key={row.ticketNumber} disableGutters>
            <ListItemText
              primary={`Ticket #${row.ticketNumber}`}
              secondary={`Earliest pickup: ${row.earliestPickupDate}`}
              slotProps={{ primary: { fontWeight: 800 } }}
            />
          </ListItem>
        ))}
      </List>
    </DialogContent>
    <DialogActions>
      <Button variant="contained" color="error" onClick={onContinue}>
        Continue
      </Button>
      <Button onClick={onClose}>Cancel</Button>
    </DialogActions>
  </Dialog>
);

export default PickupHoldDialog;
