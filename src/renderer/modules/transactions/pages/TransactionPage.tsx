import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import type { Ticket } from "../../../../shared/models/ticket.model";
import type { Client } from "../../../../shared/models/client.model";
import { useTransactionPage } from "../hooks/useTransactionPage";
import ClientBar from "../../../shared/components/ClientBar";
import TransactionTicketsPanel from "../../tickets/components/transaction/TransactionTicketsPanel";
import TransactionItemsPanel from "../../items/components/transaction/TransactionItemsPanel";
import TicketPawnDialog from "../../tickets/components/dialogs/TicketPawnDialog";
import TicketSellDialog from "../../tickets/components/dialogs/TicketSellDialog";
import TicketEditDialog from "../../tickets/components/dialogs/TicketEditDialog";
import TicketTransferDialog from "../../tickets/components/dialogs/TicketTransferDialog";
import TicketConvertDialog from "../../tickets/components/dialogs/TicketConvertDialog";
import ItemEditDialog from "../../items/components/dialogs/ItemEditDialog";
import ClientHoldDialog from "../../clients/components/ClientHoldDialog";

interface TransactionPageProps {
  isActive?: boolean;
  client?: Client;
  focusTicketNumber?: number;
  focusRequestId?: number;
  refreshKey?: number;
  incomingTicket?: Ticket | null;
  onSelectedTicketChange?: (ticket: Ticket | null) => void;
  onClientSoldTicket?: () => void;
  onClientHoldUpdated?: (client: Client) => void;
}

const TransactionPage: React.FC<TransactionPageProps> = ({
  isActive = true,
  client,
  focusTicketNumber,
  focusRequestId,
  refreshKey,
  incomingTicket,
  onSelectedTicketChange,
  onClientSoldTicket,
  onClientHoldUpdated,
}) => {
  const clientNumber = client?.client_number;
  const [holdDialogOpen, setHoldDialogOpen] = React.useState(false);
  React.useEffect(() => {
    setHoldDialogOpen(false);
  }, [clientNumber]);
  const clientFirstName = client?.first_name ?? "";
  const clientLastName = client?.last_name ?? "";
  const clientMiddleName = client?.middle_name;
  const { state, actions } = useTransactionPage({
    isActive,
    client,
    focusTicketNumber,
    focusRequestId,
    refreshKey,
    incomingTicket,
    onSelectedTicketChange,
    onClientSoldTicket,
  });
  const {
    tickets,
    items,
    selectedTicket,
    selectedItem,
    loading,
    itemsLoading,
    ticketsError,
    itemsError,
    statusMessage,
    openTicketPawnDialog,
    openTicketSellDialog,
    openTicketEditDialog,
    openTicketConvertDialog,
    openTicketTransferDialog,
    openItemDialog,
    itemDialogMode,
    removeItemTarget,
    itemCategories,
  } = state;

  if (!clientNumber) {
    return (
      <Paper elevation={0} sx={{ p: 2, height: "100%" }}>
        <Typography color="text.secondary">
          Please search and select a client first.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: "100%",
        width: "100%",
        maxWidth: 1600,
        mx: "auto",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
        <ClientBar
          client_last_name={clientLastName}
          client_first_name={clientFirstName}
          client_middle_name={clientMiddleName}
          sx={{ flex: 1 }}
        />
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={() => void actions.handleQuote()}
          sx={{ flex: "0 0 auto" }}
        >
          Quote
        </Button>
        <Button
          variant="outlined"
          onClick={() => setHoldDialogOpen(true)}
          sx={{ flex: "0 0 auto" }}
        >
          {client?.hold_until ? `Hold: ${client.hold_until}` : "Hold"}
        </Button>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <TransactionTicketsPanel
          tickets={tickets}
          selectedTicket={selectedTicket}
          transferDisabled={!clientNumber}
          onSelectTicket={actions.handleTicketSelected}
          onPawn={actions.handlePawnButtonClick}
          onSell={actions.handleSellButtonClick}
          onEdit={actions.handleEditButtonClick}
          onPrint={actions.handleTicketPrint}
          onConvert={actions.handleConvertTicket}
          onTransfer={actions.handleTransferTicket}
        />

        {(ticketsError || statusMessage) && (
          <Box sx={{ px: 0.5 }}>
            {ticketsError && (
              <Typography variant="body2" color="error">
                {ticketsError}
              </Typography>
            )}
            {statusMessage && (
              <Typography variant="body2" color="text.secondary">
                {statusMessage}
              </Typography>
            )}
          </Box>
        )}

        <Paper
          sx={{
            flex: 1,
            minHeight: 0,
            p: 1,
            border: "1px solid",
            borderColor: "primary.main",
            borderRadius: 2,
            boxShadow:
              "0 0 0 1px rgba(25, 118, 210, 0.14), 0 10px 22px rgba(15, 23, 42, 0.10)",
            boxSizing: "border-box",
            overflow: "hidden",
            backgroundColor: "background.paper",
          }}
        >
          <TransactionItemsPanel
            items={items}
            selectedItem={selectedItem ?? undefined}
            loading={itemsLoading}
            error={itemsError}
            onItemSelected={actions.handleItemClick}
            onAdd={actions.handleAddItem}
            onEdit={actions.handleEditItem}
            onDelete={actions.handleRemoveItem}
          />
        </Paper>
      </Box>

      {loading && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ position: "absolute", right: 16, bottom: 10 }}
        >
          Loading data...
        </Typography>
      )}

      {openTicketPawnDialog && (
        <TicketPawnDialog
          open={openTicketPawnDialog}
          clientFirstName={clientFirstName}
          clientLastName={clientLastName}
          clientMiddleName={clientMiddleName}
          onClose={() => actions.setOpenTicketPawnDialog(false)}
          onSave={actions.handlePawnTicket}
        />
      )}

      {holdDialogOpen && client && (
        <ClientHoldDialog
          client={client}
          onClose={() => setHoldDialogOpen(false)}
          onSaved={(updated) => onClientHoldUpdated?.(updated)}
        />
      )}

      {openTicketSellDialog && (
        <TicketSellDialog
          open={openTicketSellDialog}
          clientFirstName={clientFirstName}
          clientLastName={clientLastName}
          clientMiddleName={clientMiddleName}
          onClose={() => actions.setOpenTicketSellDialog(false)}
          onSave={actions.handleSellTicket}
        />
      )}

      {openTicketEditDialog && (
        <TicketEditDialog
          open={openTicketEditDialog}
          clientFirstName={clientFirstName}
          clientLastName={clientLastName}
          clientMiddleName={clientMiddleName}
          ticket={selectedTicket}
          onClose={() => actions.setOpenTicketEditDialog(false)}
          onSave={actions.handleEditTicket}
        />
      )}

      {openTicketTransferDialog && (
        <TicketTransferDialog
          open={openTicketTransferDialog}
          clientNumber={clientNumber}
          clientFirstName={clientFirstName}
          clientLastName={clientLastName}
          clientMiddleName={clientMiddleName}
          onClose={() => actions.setOpenTicketTransferDialog(false)}
          onLoadPreview={actions.handleLoadTransferTicketPreview}
          onTransfer={actions.handleTransferTicketConfirmed}
        />
      )}

      {openTicketConvertDialog && (
        <TicketConvertDialog
          open={openTicketConvertDialog}
          ticket={selectedTicket}
          clientFirstName={clientFirstName}
          clientLastName={clientLastName}
          clientMiddleName={clientMiddleName}
          onClose={() => actions.setOpenTicketConvertDialog(false)}
          onSave={actions.handleConvertTicketConfirmed}
        />
      )}

      {selectedTicket?.ticket_number && (
        <ItemEditDialog
          open={openItemDialog}
          mode={itemDialogMode}
          ticketNumber={selectedTicket.ticket_number}
          item={itemDialogMode === "edit" ? selectedItem : null}
          categories={itemCategories}
          onClose={() => actions.setOpenItemDialog(false)}
          onSave={actions.handleItemSaved}
        />
      )}

      <Dialog
        open={Boolean(removeItemTarget)}
        onClose={() => actions.setRemoveItemTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Remove Item</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove item #
            {removeItemTarget?.item_number}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => actions.setRemoveItemTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void actions.handleConfirmRemoveItem()}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TransactionPage;
