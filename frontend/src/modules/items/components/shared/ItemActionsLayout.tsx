import React from "react";
import { Box, Button, Tooltip } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { SIDE_ACTIONS_PANEL_WIDTH } from "../../../../shared/styles/layoutSizing";
import { actionButtonSx } from "../../../../shared/styles/actionButtonStyles";

export type ItemActionConfig = {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  onClick: () => void;
  sx?: SxProps<Theme>;
};

interface ItemActionsLayoutProps {
  actions: ItemActionConfig[];
}

const ItemActionsLayout: React.FC<ItemActionsLayoutProps> = ({ actions }) => {
  return (
    <Box
      sx={{
        width: SIDE_ACTIONS_PANEL_WIDTH,
        minWidth: SIDE_ACTIONS_PANEL_WIDTH,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "stretch",
        gap: 1,
        overflow: "hidden",
      }}
    >
      {actions.map((action) => (
        <Tooltip key={action.label} title={action.label} placement="left">
          <span style={{ display: "block", width: "100%" }}>
            <Button
              size="small"
              variant="contained"
              aria-label={action.label}
              disabled={action.disabled}
              onClick={action.onClick}
              sx={{
                ...actionButtonSx,
                ...action.sx,
                height: 34,
                p: 0,
                minWidth: 0,
                "& .MuiSvgIcon-root": {
                  fontSize: 20,
                },
              }}
            >
              {action.icon}
            </Button>
          </span>
        </Tooltip>
      ))}
    </Box>
  );
};

export default ItemActionsLayout;
