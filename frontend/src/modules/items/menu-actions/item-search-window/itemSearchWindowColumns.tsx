import type { GridColDef } from "@mui/x-data-grid";
import type { Item } from "../../../../../../shared/models/item.model";
import CellTooltip from "../../../../shared/components/CellTooltip";
import {
  formatCurrency,
  formatUppercase,
} from "../../../../shared/utils/formatters";

const formatTicketStatus = (status?: string) => {
  if (status === "pawned") {
    return "PAWNED";
  }

  if (status === "pawned_picked_up") {
    return "PICKEDUP";
  }

  if (status === "sold") {
    return "SOLD";
  }

  if (status === "pawned_expired" || status === "sold_expired") {
    return "EXPIRED";
  }

  return "---";
};

export const itemSearchWindowColumns: GridColDef<Item>[] = [
  {
    field: "item_number",
    headerName: "ITEM #",
    width: 90,
    renderCell: (params) => <CellTooltip value={params.value} fallback="---" />,
  },
  {
    field: "latest_ticket_status",
    headerName: "TICKET STATUS",
    width: 140,
    renderCell: (params) => (
      <CellTooltip value={formatTicketStatus(params.value)} fallback="---" />
    ),
  },
  {
    field: "description",
    headerName: "DESCRIPTION",
    width: 240,
    renderCell: (params) => <CellTooltip value={params.value} fallback="---" />,
  },
  {
    field: "amount",
    headerName: "PRICE",
    width: 100,
    renderCell: (params) => (
      <CellTooltip value={formatCurrency(params.value)} fallback="---" />
    ),
  },
  {
    field: "serial_number",
    headerName: "SERIAL",
    width: 150,
    renderCell: (params) => (
      <CellTooltip
        value={formatUppercase(params.value, "---")}
        fallback="---"
      />
    ),
  },
  {
    field: "model_number",
    headerName: "MODEL",
    width: 130,
    renderCell: (params) => (
      <CellTooltip
        value={formatUppercase(params.value, "---")}
        fallback="---"
      />
    ),
  },
  {
    field: "brand_name",
    headerName: "BRAND",
    width: 130,
    renderCell: (params) => (
      <CellTooltip
        value={formatUppercase(params.value, "---")}
        fallback="---"
      />
    ),
  },
  {
    field: "subcategory_name",
    headerName: "SUBCATEGORY",
    width: 150,
    renderCell: (params) => <CellTooltip value={params.value} fallback="---" />,
  },
  {
    field: "category_name",
    headerName: "CATEGORY",
    width: 130,
    renderCell: (params) => <CellTooltip value={params.value} fallback="---" />,
  },
];
