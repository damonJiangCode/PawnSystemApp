import React from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { DataGrid } from "@mui/x-data-grid";
import ClientBar from "../../../shared/components/ClientBar";
import { formatCurrency } from "../../../shared/utils/formatters";
import { type PaymentMode, usePaymentWindow } from "./usePaymentWindow";
import TicketOwnerCheckDialog from "./TicketOwnerCheckDialog";
import PickupHoldDialog from "./PickupHoldDialog";

const modeStyles: Record<
  PaymentMode,
  { tableBackground: string; accent: string }
> = {
  pickup: {
    tableBackground: "#e3f2fd",
    accent: "#1976d2",
  },
  extension: {
    tableBackground: "#fff8e1",
    accent: "#f9a825",
  },
};

const paymentTableSx = {
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
};

const PaymentWindow: React.FC = () => {
  const { state, actions } = usePaymentWindow();
  const {
    mode,
    availableRows,
    selectedRows,
    availableSelectionModel,
    selectedSelectionModel,
    loading,
    processing,
    statusMessage,
    statusSeverity,
    clientLastName,
    clientFirstName,
    columns,
    ticketSearchInputRef,
    ticketSearchValue,
    ticketSearchPreview,
    ticketSearchClientImage,
    ticketSearchDialogOpen,
    ticketSearchSelectionConflictMessage,
    ticketSearchConfirmLabel,
    pickupHoldRows,
    pickupSummaryAmount,
    extensionSummaryAmount,
    totalSummaryAmount,
  } = state;
  const selectedStyle = modeStyles[mode];

  const renderSummaryField = (
    label: string,
    value: string,
    backgroundColor: string,
    borderColor: string,
  ) => (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", fontWeight: 800 }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          mt: 0.35,
          px: 1,
          py: 0.65,
          borderRadius: 1,
          backgroundColor,
          border: `1px solid ${borderColor}`,
          fontWeight: 900,
          minHeight: 35,
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </Box>
    </Box>
  );

  const renderTicketTable = (side: "available" | "selected") => (
    <Box sx={{ flex: 1, minHeight: 0, width: "100%" }}>
      <DataGrid
        columnHeaderHeight={34}
        rowHeight={30}
        loading={loading}
        rows={side === "available" ? availableRows : selectedRows}
        columns={columns}
        getRowId={(row) => row.id}
        rowSelectionModel={
          side === "available"
            ? availableSelectionModel
            : selectedSelectionModel
        }
        onRowSelectionModelChange={
          side === "available"
            ? actions.setAvailableSelectionModel
            : actions.setSelectedSelectionModel
        }
        onRowClick={(params) => {
          const nextSelection = [params.id];
          if (side === "available") {
            actions.setAvailableSelectionModel(nextSelection);
          } else {
            actions.setSelectedSelectionModel(nextSelection);
          }
        }}
        getRowClassName={(params) =>
          [
            mode === "pickup" && !params.row.isPickupAllowed
              ? "payment-row-hold"
              : "",
            mode === "pickup" && params.row.isLost ? "payment-row-lost" : "",
          ]
            .filter(Boolean)
            .join(" ")
        }
        disableColumnMenu
        disableColumnSorting
        disableColumnFilter
        disableColumnSelector
        disableDensitySelector
        hideFooter
        localeText={{
          noRowsLabel:
            side === "available"
              ? "Load or search tickets"
              : "Move tickets here",
        }}
        sx={{
          ...paymentTableSx,
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: selectedStyle.tableBackground,
          },
          "& .MuiDataGrid-row.payment-row-hold": {
            backgroundColor: "rgba(211, 47, 47, 0.18)",
          },
          "& .MuiDataGrid-row.payment-row-hold:hover": {
            backgroundColor: "rgba(211, 47, 47, 0.26)",
          },
          "& .MuiDataGrid-row.payment-row-hold.Mui-selected": {
            backgroundColor: "rgba(211, 47, 47, 0.32)",
          },
          "& .MuiDataGrid-row.payment-row-hold .MuiDataGrid-cell": {
            borderRight: "1px solid rgba(211, 47, 47, 0.35)",
            borderBottom: "1px solid rgba(211, 47, 47, 0.35)",
          },
          "& .MuiDataGrid-row.payment-row-lost": {
            backgroundColor: "#f1ecf8",
          },
          "& .MuiDataGrid-row.payment-row-lost:hover": {
            backgroundColor: "#e8def8",
          },
          "& .MuiDataGrid-row.payment-row-lost.Mui-selected": {
            backgroundColor: "#d0bcff",
          },
          "& .MuiDataGrid-row.payment-row-lost.Mui-selected:hover": {
            backgroundColor: "#c2a7f2",
          },
          "& .MuiDataGrid-row.payment-row-lost .MuiDataGrid-cell": {
            borderRight: "1px solid rgba(103, 80, 164, 0.4)",
            borderBottom: "1px solid rgba(103, 80, 164, 0.4)",
          },
        }}
      />
    </Box>
  );

  return (
    <Box
      sx={{
        height: "100vh",
        p: 1.5,
        boxSizing: "border-box",
        backgroundColor: "#f4f7fb",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Paper
        elevation={2}
        sx={{
          p: 1.25,
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          border: "1px solid rgba(25, 118, 210, 0.18)",
        }}
      >
        <ClientBar
          client_last_name={clientLastName}
          client_first_name={clientFirstName}
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 1,
          }}
        >
          {renderSummaryField(
            "Pickup Amt",
            formatCurrency(pickupSummaryAmount),
            modeStyles.pickup.tableBackground,
            "rgba(25, 118, 210, 0.24)",
          )}
          {renderSummaryField(
            "Extension Amt",
            formatCurrency(extensionSummaryAmount),
            modeStyles.extension.tableBackground,
            "rgba(249, 168, 37, 0.32)",
          )}
          {renderSummaryField(
            "Total Amt",
            formatCurrency(totalSummaryAmount),
            "#fff",
            "#ccc",
          )}
        </Box>
      </Paper>

      <Paper
        elevation={2}
        sx={{
          flex: 1,
          minHeight: 0,
          p: 1.25,
          borderRadius: 2,
          border: "1px solid rgba(25, 118, 210, 0.18)",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: 1,
            alignItems: "center",
          }}
        >
          <Tabs
            value={mode}
            onChange={(_event, nextMode) => actions.setMode(nextMode)}
            sx={{
              minHeight: 36,
              justifySelf: "start",
              "& .MuiTab-root": {
                minHeight: 36,
                fontWeight: 900,
              },
              "& .Mui-selected": {
                color: selectedStyle.accent,
              },
              "& .MuiTabs-indicator": {
                backgroundColor: selectedStyle.accent,
              },
            }}
          >
            <Tab value="pickup" label="Buyback" />
            <Tab value="extension" label="Interest" />
          </Tabs>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Button
              variant="contained"
              onClick={() => void actions.handleLoad()}
              disabled={loading}
            >
              Load
            </Button>
            <Button variant="outlined" onClick={actions.handleClear}>
              Clear
            </Button>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifySelf: "end",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 1,
            }}
          >
            <TextField
              inputRef={ticketSearchInputRef}
              label="Ticket #"
              size="small"
              value={ticketSearchValue}
              onChange={(event) =>
                actions.setTicketSearchValue(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void actions.handleTicketSearch();
                }
              }}
              sx={{
                width: 160,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: selectedStyle.tableBackground,
                  transition: "background-color 160ms ease",
                  "& fieldset": {
                    borderColor: selectedStyle.accent,
                  },
                  "&:hover fieldset": {
                    borderColor: selectedStyle.accent,
                  },
                },
              }}
            />
            <Button
              variant="outlined"
              startIcon={<SearchIcon />}
              onClick={() => void actions.handleTicketSearch()}
              disabled={loading}
            >
              Search
            </Button>
          </Box>
        </Box>

        {statusMessage && (
          <Alert
            severity={statusSeverity === "lost" ? "warning" : statusSeverity}
            variant="outlined"
            sx={{
              py: 0.25,
              alignItems: "center",
              fontWeight: statusSeverity === "warning" ? 800 : 600,
              ...(statusSeverity === "warning"
                ? {
                    backgroundColor: "#fff3cd",
                    borderColor: "rgba(237, 108, 2, 0.55)",
                    color: "#7a3e00",
                  }
                : {}),
              ...(statusSeverity === "lost"
                ? {
                    backgroundColor: "#f1ecf8",
                    borderColor: "rgba(103, 80, 164, 0.5)",
                    color: "#4f378b",
                    fontWeight: 800,
                    "& .MuiAlert-icon": { color: "#6750a4" },
                  }
                : {}),
              "& .MuiAlert-message": {
                py: 0.5,
              },
            }}
          >
            {statusMessage}
          </Alert>
        )}

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "1fr 64px 1fr",
            gap: 1,
          }}
        >
          <Box sx={{ minWidth: 0, minHeight: 0, display: "flex" }}>
            {renderTicketTable("available")}
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 1,
            }}
          >
            {[
              { label: ">", onClick: actions.moveSelectedToSelected },
              { label: ">>", onClick: actions.moveAllToSelected },
              { label: "<<", onClick: actions.moveAllToAvailable },
              { label: "<", onClick: actions.moveSelectedToAvailable },
            ].map(({ label, onClick }) => (
              <Button
                key={label}
                variant="outlined"
                onClick={onClick}
                sx={{ minWidth: 48, fontWeight: 900 }}
              >
                {label}
              </Button>
            ))}
          </Box>

          <Box sx={{ minWidth: 0, minHeight: 0, display: "flex" }}>
            {renderTicketTable("selected")}
          </Box>
        </Box>

        <TicketOwnerCheckDialog
          open={ticketSearchDialogOpen}
          preview={ticketSearchPreview}
          clientImage={ticketSearchClientImage}
          showPickupWarnings={mode === "pickup"}
          selectionConflictMessage={ticketSearchSelectionConflictMessage}
          confirmLabel={ticketSearchConfirmLabel}
          onConfirm={actions.addTicketSearchPreviewToSelected}
          onClose={actions.closeTicketSearchDialog}
        />

        <PickupHoldDialog
          rows={pickupHoldRows}
          onContinue={actions.continuePickupHold}
          onClose={actions.closePickupHoldDialog}
        />

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button
            variant="contained"
            onClick={() => void actions.handleDone()}
            disabled={loading || processing}
          >
            Done
          </Button>
          <Button variant="outlined" onClick={() => window.close()}>
            Cancel
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default PaymentWindow;
