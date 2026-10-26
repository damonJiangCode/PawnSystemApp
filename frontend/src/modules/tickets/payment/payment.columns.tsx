import type { GridColDef } from "@mui/x-data-grid";
import CellTooltip from "../../../shared/components/CellTooltip";
import { formatCurrency, formatIsoDate } from "../../../shared/utils/formatters";
import type { PaymentMode, PaymentTicketRow } from "./payment.types";

export const createPaymentColumns = (
  mode: PaymentMode,
): GridColDef<PaymentTicketRow>[] => [
  {
    field: "ticketNumber",
    headerName: "TICKET #",
    width: 92,
    renderCell: (params) => <CellTooltip value={params.value} />,
  },
  {
    field: "location",
    headerName: "LOC",
    width: 86,
    renderCell: (params) => <CellTooltip value={params.value} />,
  },
  {
    field: "description",
    headerName: "DESC",
    flex: 1,
    minWidth: 160,
    renderCell: (params) => <CellTooltip value={params.value} />,
  },
  {
    field: "dueDate",
    headerName: "DUE",
    width: 104,
    renderCell: (params) => <CellTooltip value={formatIsoDate(params.value)} />,
  },
  ...(mode === "pickup"
    ? [
        {
          field: "pickupAmount",
          headerName: "PICKUP",
          width: 104,
          renderCell: (params) => (
            <CellTooltip value={formatCurrency(params.value)} />
          ),
        } satisfies GridColDef<PaymentTicketRow>,
      ]
    : []),
  {
    field: "extensionAmount",
    headerName: mode === "pickup" ? "EXT / 30" : "EXT",
    width: 112,
    renderCell: (params) => <CellTooltip value={formatCurrency(params.value)} />,
  },
];
