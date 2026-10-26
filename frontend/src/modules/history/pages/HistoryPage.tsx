import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import type { Client } from "../../../../../shared/models/client.model";
import type { Ticket } from "../../../../../shared/models/ticket.model";
import type { Item } from "../../../../../shared/models/item.model";
import ClientBar from "../../../shared/components/ClientBar";
import HistoryTicketsPanel from "../../tickets/components/history/HistoryTicketsPanel";
import HistoryItemsPanel from "../../items/components/history/HistoryItemsPanel";
import TicketPawnDialog from "../../tickets/components/dialogs/TicketPawnDialog";
import ItemEditDialog from "../../items/components/dialogs/ItemEditDialog";
import type { ReverseTicketResult } from "../../tickets/ticket.api";
import ReverseTicketDialog from "../components/ReverseTicketDialog";
import { useHistoryPage } from "../hooks/useHistoryPage";

interface HistoryPageProps {
  isActive?: boolean;
  client?: Client;
  clientNumber?: number;
  clientLastName?: string;
  clientFirstName?: string;
  clientMiddleName?: string;
  focusTicketNumber?: number;
  focusRequestId?: number;
  refreshKey?: number;
  activationKey?: number;
  onRepawnCreated?: (
    ticket: Ticket,
    sourceTicket: Ticket,
    sourceItems: Item[],
  ) => void;
  onReverseCompleted?: (result: ReverseTicketResult) => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({
  isActive = true,
  client,
  clientNumber,
  clientLastName,
  clientFirstName,
  clientMiddleName,
  focusTicketNumber,
  focusRequestId,
  refreshKey = 0,
  activationKey = 0,
  onRepawnCreated,
  onReverseCompleted,
}) => {
  const resolvedClientNumber = client?.client_number ?? clientNumber;
  const resolvedClientLastName = client?.last_name ?? clientLastName;
  const resolvedClientFirstName = client?.first_name ?? clientFirstName;
  const resolvedClientMiddleName = client?.middle_name ?? clientMiddleName;
  const { state, actions } = useHistoryPage({
    isActive,
    clientNumber: resolvedClientNumber,
    clientIsActive: client?.is_active,
    printClient: client,
    focusTicketNumber,
    focusRequestId,
    refreshKey,
    activationKey,
    onRepawnCreated,
    onReverseCompleted,
  });
  const {
    tickets,
    selectedTicket,
    items,
    selectedItem,
    ticketsLoading,
    itemsLoading,
    ticketsError,
    itemsError,
    statusMessage,
    openRepawnDialog,
    reverseTicket,
    reverseError,
    reverseProcessing,
    openItemEditDialog,
    itemCategories,
  } = state;

  if (!resolvedClientNumber) {
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
        boxSizing: "border-box",
      }}
    >
      <ClientBar
        is_active={client?.is_active}
        client_last_name={resolvedClientLastName}
        client_first_name={resolvedClientFirstName}
        client_middle_name={resolvedClientMiddleName}
        sx={{ mb: 1 }}
      />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          overflow: "hidden",
        }}
      >
        <HistoryTicketsPanel
          issuanceDisabled={client?.is_active === false}
          tickets={tickets}
          selectedTicket={selectedTicket}
          loading={ticketsLoading}
          scrollRequestKey={state.ticketScrollRequestKey}
          onSelectTicket={(ticket) => {
            actions.setSelectedTicket(ticket);
            actions.setStatusMessage("");
          }}
          onRepawn={actions.handleRepawn}
          onLoad={actions.handleLoad}
          onReverse={actions.handleReverse}
        />

        {(ticketsError || itemsError || statusMessage) && (
          <Box sx={{ px: 0.5 }}>
            {(ticketsError || itemsError) && (
              <Typography variant="body2" color="error">
                {ticketsError || itemsError}
              </Typography>
            )}
            {statusMessage && (
              <Typography variant="body2" color="text.secondary">
                {statusMessage}
              </Typography>
            )}
          </Box>
        )}

        <HistoryItemsPanel
          items={items}
          selectedItem={selectedItem}
          loading={itemsLoading}
          onSelectItem={actions.setSelectedItem}
          onEditItem={actions.handleEditItem}
        />
      </Box>

      {openRepawnDialog && selectedTicket && (
        <TicketPawnDialog
          open={openRepawnDialog}
          clientFirstName={resolvedClientFirstName || ""}
          clientLastName={resolvedClientLastName || ""}
          clientMiddleName={resolvedClientMiddleName}
          dialogTitle={`Repawn Ticket #${selectedTicket.ticket_number}`}
          saveLabel="Repawn"
          initialValues={{
            description: selectedTicket.description,
            location: selectedTicket.location,
            amount: selectedTicket.amount,
            onetime_fee: selectedTicket.onetime_fee,
          }}
          onClose={() => actions.setOpenRepawnDialog(false)}
          onSave={actions.handleRepawnSave}
        />
      )}

      {reverseTicket && (
        <ReverseTicketDialog
          ticket={reverseTicket}
          clientFirstName={resolvedClientFirstName}
          clientLastName={resolvedClientLastName}
          clientMiddleName={resolvedClientMiddleName}
          error={reverseError}
          processing={reverseProcessing}
          onClose={actions.closeReverseDialog}
          onConfirm={() => void actions.handleReverseConfirm()}
        />
      )}

      {openItemEditDialog && selectedTicket?.ticket_number && (
        <ItemEditDialog
          open={openItemEditDialog}
          mode="edit"
          ticketNumber={selectedTicket.ticket_number}
          item={selectedItem}
          categories={itemCategories}
          onClose={() => actions.setOpenItemEditDialog(false)}
          onSave={actions.handleItemSaved}
        />
      )}
    </Paper>
  );
};

export default HistoryPage;
