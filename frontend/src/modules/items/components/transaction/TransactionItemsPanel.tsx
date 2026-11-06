import React from "react";
import { Box } from "@mui/material";
import type { Item } from "../../../../../../shared/models/item.model";
import TransactionItemsTable from "./TransactionItemsTable";
import TransactionItemSidePanel from "./TransactionItemSidePanel";

interface TransactionItemsPanelProps {
  items: Item[];
  selectedItem?: Item;
  loading?: boolean;
  error?: string;
  onItemSelected: (item: Item) => void;
  onAdd: () => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}

const TransactionItemsPanel: React.FC<TransactionItemsPanelProps> = (props) => {
  const {
    items,
    selectedItem,
    loading = false,
    error = "",
    onItemSelected,
    onAdd,
    onEdit,
    onDelete,
  } = props;

  return (
    <Box
      sx={{
        display: "flex",
        gap: 0.75,
        height: "100%",
        minHeight: 0,
        alignItems: "stretch",
        overflow: "hidden",
      }}
    >
      <Box sx={{ flex: "1 1 0", minWidth: 0, minHeight: 0 }}>
        <TransactionItemsTable
          items={items}
          selectedItem={selectedItem}
          onItemSelected={onItemSelected}
        />
      </Box>

      <TransactionItemSidePanel
        selectedItem={selectedItem}
        loading={loading}
        error={error}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </Box>
  );
};

export default TransactionItemsPanel;
