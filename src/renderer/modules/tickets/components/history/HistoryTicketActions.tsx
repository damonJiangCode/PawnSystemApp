import React from "react";
import ReplayIcon from "@mui/icons-material/Replay";
import InputIcon from "@mui/icons-material/Input";
import UndoIcon from "@mui/icons-material/Undo";
import type { Ticket } from "../../../../../shared/models/ticket.model";
import { canRepawnTicket } from "../../../history/history.helpers";
import TicketActionsLayout from "../shared/TicketActionsLayout";

interface HistoryTicketActionsProps {
  selectedTicket?: Ticket | null;
  issuanceDisabled?: boolean;
  onRepawn: () => void;
  onLoad: () => void;
  onReverse: () => void;
}

const HistoryTicketActions: React.FC<HistoryTicketActionsProps> = ({
  selectedTicket,
  issuanceDisabled = false,
  onRepawn,
  onLoad,
  onReverse,
}) => {
  const disabled = !selectedTicket;
  const repawnDisabled = issuanceDisabled || !canRepawnTicket(selectedTicket);
  const reverseDisabled =
    !selectedTicket ||
    (selectedTicket.status !== "pawned_expired" &&
      selectedTicket.status !== "pawned_picked_up");

  return (
    <TicketActionsLayout
      actions={[
        {
          label: "Repn",
          icon: <ReplayIcon fontSize="small" />,
          disabled: repawnDisabled,
          onClick: onRepawn,
        },
        {
          label: "Load",
          icon: <InputIcon fontSize="small" />,
          disabled,
          onClick: onLoad,
        },
        {
          label: "Reverse",
          icon: <UndoIcon fontSize="small" />,
          disabled: reverseDisabled,
          onClick: onReverse,
        },
      ]}
    />
  );
};

export default HistoryTicketActions;
