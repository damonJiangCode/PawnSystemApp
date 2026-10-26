import React from "react";
import { Paper, Typography } from "@mui/material";
import type { Item } from "../../../../../../shared/models/item.model";
import {
  SIDE_ACTIONS_PANEL_WIDTH,
  SIDE_PANEL_WIDTH,
} from "../../../../shared/styles/layoutSizing";
import TransactionItemActions from "./TransactionItemActions";
import TransactionItemImage from "./TransactionItemImage";

interface TransactionItemSidePanelProps {
  selectedItem?: Item;
  loading?: boolean;
  error?: string;
  onAdd: () => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}

const TransactionItemSidePanel: React.FC<TransactionItemSidePanelProps> = ({
  selectedItem,
  loading = false,
  error = "",
  onAdd,
  onEdit,
  onDelete,
}) => {
  return (
    <Paper
      sx={{
        width: SIDE_PANEL_WIDTH,
        minWidth: 292,
        border: "1px solid",
        borderColor: "divider",
        minHeight: 0,
        height: "100%",
        overflow: "hidden",
        flexShrink: 0,
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: `minmax(0, 1fr) ${SIDE_ACTIONS_PANEL_WIDTH}px`,
        alignItems: "stretch",
        columnGap: 0.75,
        p: 0.75,
      }}
    >
      <TransactionItemImage selectedItem={selectedItem} loading={loading} />
      <TransactionItemActions
        selectedItem={selectedItem}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Paper>
  );
};

export default TransactionItemSidePanel;
