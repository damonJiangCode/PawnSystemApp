import React from "react";
import { Box, Button } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { actionButtonSx } from "../../../../shared/styles/actionButtonStyles";

export type TicketActionConfig = {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  sx?: SxProps<Theme>;
};

interface TicketActionsLayoutProps {
  actions: TicketActionConfig[];
  justifyContent?: "center" | "space-between";
}

const TicketActionsLayout: React.FC<TicketActionsLayoutProps> = ({
  actions,
  justifyContent = "center",
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent,
        alignItems: "stretch",
        gap: 1,
        width: "100%",
        height: "100%",
      }}
    >
      {actions.map((action) => (
        <Button
          key={action.label}
          size="small"
          variant="contained"
          sx={{
            ...actionButtonSx,
            ...action.sx,
          }}
          disabled={action.disabled}
          onClick={action.onClick}
          startIcon={action.icon}
        >
          {action.label}
        </Button>
      ))}
    </Box>
  );
};

export default TicketActionsLayout;
