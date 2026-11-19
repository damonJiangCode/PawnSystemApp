import React from "react";
import { Box, Paper } from "@mui/material";
import type { Item } from "@pawnsystem/shared/models/item.model";
import ItemsTable from "../../components/ItemsTable";
import ItemImage from "../../components/ItemImage";
import HistoryItemActions from "./HistoryItemActions";
import {
  SIDE_ACTIONS_PANEL_WIDTH,
  SIDE_PANEL_WIDTH,
} from "../../styles/layoutSizing";

interface HistoryItemsPanelProps {
  items: Item[];
  selectedItem?: Item | null;
  loading?: boolean;
  onSelectItem: (item: Item) => void;
  onEditItem: (item: Item) => void;
}

const HistoryItemsPanel: React.FC<HistoryItemsPanelProps> = ({
  items,
  selectedItem,
  loading = false,
  onSelectItem,
  onEditItem,
}) => {
  return (
    <Paper
      sx={{
        flex: 1,
        minHeight: 0,
        p: 1,
        border: "1px solid",
        borderColor: "primary.main",
        borderRadius: 2,
        backgroundColor: "background.paper",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
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
          <ItemsTable
            items={items}
            selectedItem={selectedItem ?? undefined}
            onItemSelected={onSelectItem}
          />
        </Box>
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
          <ItemImage
            selectedItem={selectedItem ?? undefined}
            loading={loading}
          />
          <HistoryItemActions
            selectedItem={selectedItem ?? undefined}
            onEdit={onEditItem}
          />
        </Paper>
      </Box>
    </Paper>
  );
};

export default HistoryItemsPanel;
