import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import type { Item } from "@pawnsystem/shared/models/item.model";
import CellTooltip from "./CellTooltip";
import { formatDisplayValue } from "../lib/formatters";

const getItemRowId = (row: Item): number | string =>
  row.draft_id ?? row.item_number;

const itemColumns: GridColDef[] = [
  {
    field: "item_number_display",
    headerName: "ITM_NO",
    width: 90,
    valueGetter: (_value, row: Item) =>
      row.source_item_number ?? row.item_number,
    renderCell: (params) => <CellTooltip value={params.value} />,
  },
  {
    field: "quantity",
    headerName: "QTY",
    width: 55,
    renderCell: (params) => (
      <CellTooltip value={formatDisplayValue(params.value, "")} />
    ),
  },
  {
    field: "description",
    headerName: "DESC",
    width: 200,
    renderCell: (params) => <CellTooltip value={params.value} />,
  },
  {
    field: "serial_number",
    headerName: "SERIAL",
    width: 80,
    renderCell: (params) => (
      <CellTooltip value={formatDisplayValue(params.value, "")} />
    ),
  },
  {
    field: "model_number",
    headerName: "MODEL",
    width: 80,
    renderCell: (params) => (
      <CellTooltip value={formatDisplayValue(params.value, "")} />
    ),
  },
  {
    field: "brand_name",
    headerName: "BRAND",
    width: 80,
    renderCell: (params) => (
      <CellTooltip value={formatDisplayValue(params.value, "")} />
    ),
  },
  {
    field: "amount",
    headerName: "VALUE",
    width: 80,
    renderCell: (params) => (
      <CellTooltip
        value={
          params.value != null && params.value !== "" ? `$${params.value}` : ""
        }
      />
    ),
  },
];

const itemsTableSx = {
  border: "1px solid #ccc",
  "& .MuiDataGrid-cell": {
    borderRight: "1px solid #ddd",
    borderBottom: "1px solid #ddd",
  },
  "& .MuiDataGrid-columnHeaders": {
    borderBottom: "2px solid #bbb",
  },
  "& .MuiDataGrid-columnHeader": {
    borderRight: "1px solid #ddd",
    backgroundColor: "#fafafa",
    py: 0,
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontWeight: 600,
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "#f5f5f5",
  },
  "& .MuiDataGrid-row.Mui-selected": {
    backgroundColor: "#d0d7de",
  },
  "& .MuiDataGrid-row.Mui-selected:hover": {
    backgroundColor: "#c6d0d9",
  },
  "& .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell": {
    borderRight: "1px solid #9aa4af",
    borderBottom: "1px solid #9aa4af",
  },
};

interface ItemsTableProps {
  items: Item[];
  selectedItem?: Item;
  onItemSelected: (i: Item) => void;
}

const ItemsTable: React.FC<ItemsTableProps> = ({
  items,
  selectedItem,
  onItemSelected,
}) => {
  return (
    <Box sx={{ height: "100%", width: "100%" }}>
      <DataGrid
        columnHeaderHeight={34}
        rowHeight={30}
        rows={items}
        columns={itemColumns}
        getRowId={getItemRowId}
        rowSelectionModel={selectedItem ? [getItemRowId(selectedItem)] : []}
        onRowClick={(params) => {
          const selectedItem = items.find(
            (item) => getItemRowId(item) === params.id,
          );
          if (selectedItem) onItemSelected(selectedItem);
        }}
        disableColumnMenu
        disableColumnSorting
        disableColumnFilter
        disableColumnSelector
        disableDensitySelector
        hideFooter
        localeText={{
          noRowsLabel: "No items",
        }}
        sx={itemsTableSx}
      />
    </Box>
  );
};

export default ItemsTable;
