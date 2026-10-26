import DateField from "../../../shared/components/DateField";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  GlobalStyles,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import { ticketApi } from "../../tickets/ticket.api";
import {
  formatCurrency,
  formatIsoDate,
} from "../../../shared/utils/formatters";
import WindowLayout from "../../../windows/WindowLayout";
import type { WindowScreenProps } from "../../../windows/windowRegistry";
import ReportDocument from "../components/ReportDocument";

const getBuybackReportFileName = (date: Date) => {
  const month = date.toLocaleString("en-US", { month: "short" }).toLowerCase();
  const day = String(date.getDate()).padStart(2, "0");
  return `buyback_report_${month}_${day}_${date.getFullYear()}`;
};

const BuybackReportWindow: React.FC<WindowScreenProps> = () => {
  const today = useMemo(() => formatIsoDate(new Date()), []);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [report, setReport] =
    useState<Awaited<ReturnType<typeof ticketApi.loadBuybackReport>>>();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReport = async () => {
    if (!fromDate || !toDate) {
      setErrorMessage("Select both From and To dates.");
      return;
    }

    if (fromDate > toDate) {
      setErrorMessage("To date must be the same as or later than From date.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextReport = await ticketApi.loadBuybackReport({
        from_date: fromDate,
        to_date: toDate,
      });
      setReport(nextReport);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load report.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const rows = report?.rows ?? [];
  const ticketCount = new Set(rows.map((row) => row.ticket_number)).size;

  const printReport = () => {
    const previousTitle = document.title;
    document.title = getBuybackReportFileName(new Date());

    window.addEventListener(
      "afterprint",
      () => {
        document.title = previousTitle;
      },
      { once: true },
    );
    window.print();
  };

  return (
    <WindowLayout
      title="Buyback Report"
      description="Generate  buyback payment records."
    >
      <GlobalStyles
        styles={{
          "@media print": {
            ".no-print": {
              display: "none !important",
            },
            body: {
              background: "#fff !important",
            },
          },
        }}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minHeight: "100%",
          "@media print": {
            gap: 1.5,
          },
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          className="no-print"
          sx={{ displayPrint: "none" }}
        >
          <DateField
            format="YYYY-MM-DD"
            label="From"
            size="small"
            value={fromDate}
            onValueChange={(value) => {
              setFromDate(value);
              setReport(undefined);
              setErrorMessage("");
            }}
            sx={{ width: { xs: "100%", sm: 180 } }}
          />
          <DateField
            format="YYYY-MM-DD"
            label="To"
            size="small"
            value={toDate}
            onValueChange={(value) => {
              setToDate(value);
              setReport(undefined);
              setErrorMessage("");
            }}
            sx={{ width: { xs: "100%", sm: 180 } }}
          />
          <Button
            variant="contained"
            startIcon={
              isLoading ? <CircularProgress size={16} /> : <RefreshIcon />
            }
            onClick={() => void loadReport()}
            disabled={isLoading}
          >
            Generate
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={printReport}
            disabled={isLoading || !report}
          >
            Print / Save PDF
          </Button>
        </Stack>

        {errorMessage ? (
          <Alert
            severity="error"
            className="no-print"
            sx={{ displayPrint: "none" }}
          >
            {errorMessage}
          </Alert>
        ) : null}

        {report ? (
          <ReportDocument
            title="Buyback Report"
            fromDate={report.from_date}
            toDate={report.to_date}
            footer={
              <>
                <Typography variant="body2" fontWeight={800}>
                  TICKETS: {ticketCount}
                </Typography>
                <Typography variant="body2" fontWeight={900}>
                  TOTAL: {formatCurrency(report.total_buyback_price)}
                </Typography>
              </>
            }
          >
            <TableContainer>
              <Table size="small" aria-label="buyback report">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Ticket #</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length ? (
                    rows.map((row) => (
                      <TableRow key={row.ticket_number}>
                        <TableCell sx={{ fontWeight: 800 }}>
                          {row.ticket_number}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>
                          {formatCurrency(row.pickup_amount_paid)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>
                          {row.description}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>
                          {row.client_name}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No buybacks found for this date range.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </ReportDocument>
        ) : !isLoading && !errorMessage ? (
          <Typography color="text.secondary">
            Select a date range and generate the report.
          </Typography>
        ) : null}
      </Box>
    </WindowLayout>
  );
};

export default BuybackReportWindow;
