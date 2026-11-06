import React from "react";
import AddIcon from "@mui/icons-material/Add";
import SellIcon from "@mui/icons-material/Sell";
import EditIcon from "@mui/icons-material/Edit";
import PrintIcon from "@mui/icons-material/Print";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import type { Ticket } from "../../../../../../shared/models/ticket.model";
import TicketActionsLayout from "../shared/TicketActionsLayout";

interface TransactionTicketActionsProps {
  selectedTicket: Ticket | null;
  transferDisabled?: boolean;
  issuanceDisabled?: boolean;
  onPawn: () => void;
  onSell: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onConvert: () => void;
  onTransfer: () => void;
}

const TransactionTicketActions: React.FC<TransactionTicketActionsProps> = (
  props,
) => {
  const {
    selectedTicket,
    transferDisabled = false,
    issuanceDisabled = false,
    onPawn,
    onSell,
    onEdit,
    onPrint,
    onConvert,
    onTransfer,
  } = props;
  const ticketActionDisabled = !selectedTicket;

  return (
    <TicketActionsLayout
      justifyContent="space-between"
      actions={[
        {
          label: "Pawn",
          disabled: issuanceDisabled,
          icon: <AddIcon fontSize="small" />,
          onClick: onPawn,
        },
        {
          label: "Sell",
          disabled: issuanceDisabled,
          icon: <SellIcon fontSize="small" />,
          onClick: onSell,
        },
        {
          label: "Edit",
          icon: <EditIcon fontSize="small" />,
          disabled: ticketActionDisabled,
          onClick: onEdit,
        },
        {
          label: "Prnt",
          icon: <PrintIcon fontSize="small" />,
          disabled: ticketActionDisabled,
          onClick: onPrint,
        },
        {
          label: "Conv",
          icon: <AutorenewIcon fontSize="small" />,
          disabled: ticketActionDisabled || issuanceDisabled,
          onClick: onConvert,
        },
        {
          label: "Trns",
          icon: <SwapHorizIcon fontSize="small" />,
          disabled: transferDisabled || issuanceDisabled,
          onClick: onTransfer,
        },
      ]}
    />
  );
};

export default TransactionTicketActions;
