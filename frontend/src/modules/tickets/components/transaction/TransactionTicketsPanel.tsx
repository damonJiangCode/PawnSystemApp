import React from "react";
import { Box, Paper } from "@mui/material";
import type { Ticket } from "../../../../../../shared/models/ticket.model";
import { TICKET_ACTIONS_PANEL_WIDTH } from "../../layout/ticketLayout";
import TransactionTicketsTable from "./TransactionTicketsTable";
import TransactionTicketActions from "./TransactionTicketActions";

interface TransactionTicketsPanelProps {
  tickets: Ticket[];
  selectedTicket?: Ticket | null;
  transferDisabled?: boolean;
  issuanceDisabled?: boolean;
  onSelectTicket: (ticket: Ticket | null) => void;
  onPawn: () => void;
  onSell: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onConvert: () => void;
  onTransfer: () => void;
}

const TransactionTicketsPanel: React.FC<TransactionTicketsPanelProps> = ({
  tickets,
  selectedTicket,
  transferDisabled = false,
  issuanceDisabled = false,
  onSelectTicket,
  onPawn,
  onSell,
  onEdit,
  onPrint,
  onConvert,
  onTransfer,
}) => {
  return (
    <Paper
      sx={{
        flex: "0 0 56%",
        minHeight: 0,
        display: "flex",
        gap: 0.75,
        border: "1px solid",
        borderColor: "primary.main",
        borderRadius: 2,
        p: 1,
        backgroundColor: "background.paper",
        boxShadow:
          "0 0 0 1px rgba(25, 118, 210, 0.14), 0 10px 22px rgba(15, 23, 42, 0.10)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <TransactionTicketsTable
            tickets={tickets}
            selectedTicket={selectedTicket}
            onSelectTicket={onSelectTicket}
          />
        </Box>
      </Box>

      <Paper
        sx={{
          width: TICKET_ACTIONS_PANEL_WIDTH,
          minHeight: 0,
          p: 1.25,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          boxShadow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        <TransactionTicketActions
          selectedTicket={selectedTicket ?? null}
          transferDisabled={transferDisabled}
          issuanceDisabled={issuanceDisabled}
          onPawn={onPawn}
          onSell={onSell}
          onEdit={onEdit}
          onPrint={onPrint}
          onConvert={onConvert}
          onTransfer={onTransfer}
        />
      </Paper>
    </Paper>
  );
};

export default TransactionTicketsPanel;
