import React, { useMemo } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import {
  FirstPage,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  LastPage,
} from "@mui/icons-material";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import type { Ticket } from "../../../../../../shared/models/ticket.model";
import CellTooltip from "../../../../shared/components/CellTooltip";
import {
  formatCurrency,
  formatIsoDate,
  formatIsoDateTime,
  formatUppercase,
} from "../../../../shared/utils/formatters";

interface HistoryTicketsTableProps {
  tickets: Ticket[];
  selectedTicket?: Ticket | null;
  loading?: boolean;
  scrollRequestKey?: number;
  onSelectTicket: (ticket: Ticket | null) => void;
}

const HISTORY_PAGE_SIZE = 100;

const getHistoryStatusLabel = (ticket: Ticket) => {
  if (ticket.is_stolen) {
    return "S";
  }

  if (ticket.status === "pawned_picked_up") {
    return "P";
  }

  if (ticket.status === "pawned_expired" || ticket.status === "sold_expired") {
    return "E";
  }

  return "---";
};

const HistoryTicketsTable: React.FC<HistoryTicketsTableProps> = ({
  tickets,
  selectedTicket,
  loading = false,
  scrollRequestKey = 0,
  onSelectTicket,
}) => {
  const apiRef = useGridApiRef();
  const lastScrollTargetRef = React.useRef("");
  const pendingScrollRowIndexRef = React.useRef<number | null>(null);
  const [paginationModel, setPaginationModel] =
    React.useState<GridPaginationModel>({
      page: 0,
      pageSize: HISTORY_PAGE_SIZE,
    });
  const [scrollTrigger, setScrollTrigger] = React.useState(0);
  const pageCount = Math.max(1, Math.ceil(tickets.length / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(paginationModel.page, pageCount - 1);

  const setPage = (page: number) => {
    const targetPage = Math.min(Math.max(page, 0), pageCount - 1);
    const targetRowIndex =
      Math.min((targetPage + 1) * HISTORY_PAGE_SIZE, tickets.length) - 1;

    pendingScrollRowIndexRef.current = targetRowIndex;
    setPaginationModel({
      page: targetPage,
      pageSize: HISTORY_PAGE_SIZE,
    });
    setScrollTrigger((prev) => prev + 1);
  };

  const CompactFooter = () => (
    <Box
      sx={{
        height: 28,
        minHeight: 28,
        px: 0.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 0.25,
        borderTop: "1px solid #ddd",
        boxSizing: "border-box",
      }}
    >
      <IconButton
        size="small"
        disabled={currentPage <= 0}
        onClick={() => setPage(0)}
        sx={{ width: 24, height: 24, p: 0 }}
      >
        <FirstPage fontSize="inherit" />
      </IconButton>
      <IconButton
        size="small"
        disabled={currentPage <= 0}
        onClick={() => setPage(currentPage - 1)}
        sx={{ width: 24, height: 24, p: 0 }}
      >
        <KeyboardArrowLeft fontSize="inherit" />
      </IconButton>
      <Typography
        component="span"
        sx={{
          minWidth: 40,
          textAlign: "center",
          fontSize: 12,
          lineHeight: "24px",
          color: "text.secondary",
        }}
      >
        {currentPage + 1} / {pageCount}
      </Typography>
      <IconButton
        size="small"
        disabled={currentPage >= pageCount - 1}
        onClick={() => setPage(currentPage + 1)}
        sx={{ width: 24, height: 24, p: 0 }}
      >
        <KeyboardArrowRight fontSize="inherit" />
      </IconButton>
      <IconButton
        size="small"
        disabled={currentPage >= pageCount - 1}
        onClick={() => setPage(pageCount - 1)}
        sx={{ width: 24, height: 24, p: 0 }}
      >
        <LastPage fontSize="inherit" />
      </IconButton>
    </Box>
  );

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: "ticket_number",
        headerName: "#",
        width: 80,
        renderCell: (params) => (
          <CellTooltip value={params.value} fallback="---" />
        ),
      },
      {
        field: "status",
        headerName: "STATUS",
        width: 50,
        renderCell: (params) => (
          <CellTooltip
            value={getHistoryStatusLabel(params.row)}
            fallback="---"
          />
        ),
      },
      {
        field: "transaction_datetime",
        headerName: "DATE",
        width: 112,
        renderCell: (params) => (
          <CellTooltip
            value={params.value ? formatIsoDate(params.value) : null}
            title={params.value ? formatIsoDateTime(params.value) : "---"}
            fallback="---"
          />
        ),
      },
      {
        field: "location",
        headerName: "LOC",
        width: 72,
        renderCell: (params) => (
          <CellTooltip value={params.value} fallback="---" />
        ),
      },
      {
        field: "description",
        headerName: "DESC",
        width: 160,
        renderCell: (params) => (
          <CellTooltip value={params.value} fallback="---" />
        ),
      },
      {
        field: "due_date",
        headerName: "DUE",
        width: 112,
        renderCell: (params) => (
          <CellTooltip
            value={params.value ? formatIsoDate(params.value) : null}
            fallback="---"
          />
        ),
      },
      {
        field: "amount",
        headerName: "AMT",
        width: 86,
        renderCell: (params) => (
          <CellTooltip value={formatCurrency(params.value)} fallback="---" />
        ),
      },
      {
        field: "pickup_datetime",
        headerName: "PKDATE",
        width: 112,
        renderCell: (params) => (
          <CellTooltip
            value={params.value ? formatIsoDate(params.value) : null}
            title={params.value ? formatIsoDateTime(params.value) : "---"}
            fallback="---"
          />
        ),
      },
      {
        field: "expire_date",
        headerName: "EXPDATE",
        width: 112,
        renderCell: (params) => (
          <CellTooltip
            value={params.value ? formatIsoDate(params.value) : null}
            title={params.value ? formatIsoDateTime(params.value) : "---"}
            fallback="---"
          />
        ),
      },
      {
        field: "employee_name",
        headerName: "EMP",
        width: 120,
        renderCell: (params) => (
          <CellTooltip
            value={formatUppercase(params.value, "")}
            fallback="---"
          />
        ),
      },
    ],
    [],
  );

  React.useEffect(() => {
    if (!tickets.length) {
      return;
    }

    const selectedIndex = selectedTicket?.ticket_number
      ? tickets.findIndex(
          (ticket) => ticket.ticket_number === selectedTicket.ticket_number,
        )
      : -1;
    const targetIndex = selectedIndex >= 0 ? selectedIndex : tickets.length - 1;
    const targetPage = Math.floor(targetIndex / HISTORY_PAGE_SIZE);
    const targetPageIndex = targetIndex - targetPage * HISTORY_PAGE_SIZE;
    const scrollTargetKey = `${scrollRequestKey}:${targetPage}:${targetPageIndex}`;

    if (lastScrollTargetRef.current === scrollTargetKey) {
      return;
    }

    lastScrollTargetRef.current = scrollTargetKey;
    pendingScrollRowIndexRef.current = targetIndex;

    setPaginationModel((prev) =>
      prev.page === targetPage && prev.pageSize === HISTORY_PAGE_SIZE
        ? prev
        : { page: targetPage, pageSize: HISTORY_PAGE_SIZE },
    );
    setScrollTrigger((prev) => prev + 1);
  }, [scrollRequestKey, tickets]);

  React.useEffect(() => {
    if (pendingScrollRowIndexRef.current === null) {
      return;
    }

    const targetRowIndex = pendingScrollRowIndexRef.current;
    pendingScrollRowIndexRef.current = null;
    const scrollToTarget = () => {
      apiRef.current.scrollToIndexes({
        rowIndex: targetRowIndex,
      });
    };

    const animationFrameId = window.requestAnimationFrame(scrollToTarget);
    const timeoutId = window.setTimeout(scrollToTarget, 80);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(timeoutId);
    };
  }, [apiRef, paginationModel.page, paginationModel.pageSize, scrollTrigger]);

  return (
    <DataGrid
      apiRef={apiRef}
      columnHeaderHeight={34}
      rowHeight={30}
      rows={tickets}
      columns={columns}
      getRowId={(row) => row.ticket_number}
      paginationModel={paginationModel}
      onPaginationModelChange={(model) => {
        setPaginationModel((prev) =>
          prev.page === model.page && prev.pageSize === HISTORY_PAGE_SIZE
            ? prev
            : {
                page: model.page,
                pageSize: HISTORY_PAGE_SIZE,
              },
        );
      }}
      pageSizeOptions={[HISTORY_PAGE_SIZE]}
      slots={{ footer: CompactFooter }}
      rowSelectionModel={
        selectedTicket?.ticket_number ? [selectedTicket.ticket_number] : []
      }
      onRowClick={(params) => {
        const clickedTicket =
          tickets.find((ticket) => ticket.ticket_number === params.id) ?? null;
        onSelectTicket(clickedTicket);
      }}
      loading={loading}
      disableColumnMenu
      disableColumnSorting
      disableColumnFilter
      disableColumnSelector
      disableDensitySelector
      localeText={{ noRowsLabel: "No tickets" }}
      sx={{
        border: "1px solid #ccc",
        "& .MuiDataGrid-cell": {
          borderRight: "1px solid #ddd",
          borderBottom: "1px solid #ddd",
          display: "flex",
          alignItems: "center",
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
      }}
    />
  );
};

export default HistoryTicketsTable;
