import DateField from "../../../shared/components/DateField";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
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

const detailValue = (value: string | number | undefined) =>
  value === undefined || value === "" ? "---" : String(value);

const getDailyReportFileName = (date: Date) => {
  const month = date.toLocaleString("en-US", { month: "short" }).toLowerCase();
  const day = String(date.getDate()).padStart(2, "0");
  return `daily_report_${month}_${day}_${date.getFullYear()}`;
};

const DailyReportWindow: React.FC<WindowScreenProps> = () => {
  const today = useMemo(() => formatIsoDate(new Date()), []);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [report, setReport] =
    useState<Awaited<ReturnType<typeof ticketApi.loadDailyReport>>>();
  const [missingTicketNumbers, setMissingTicketNumbers] = useState<number[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const printReport = () => {
    const previousTitle = document.title;
    document.title = getDailyReportFileName(new Date());

    window.addEventListener(
      "afterprint",
      () => {
        document.title = previousTitle;
      },
      { once: true },
    );
    window.print();
  };

  const resetGeneratedReport = () => {
    setReport(undefined);
    setMissingTicketNumbers([]);
    setErrorMessage("");
  };

  const generateReport = async () => {
    if (!fromDate || !toDate) {
      setErrorMessage("Select both From and To dates.");
      return;
    }

    if (fromDate > toDate) {
      setErrorMessage("To date must be the same as or later than From date.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setMissingTicketNumbers([]);

    try {
      const nextReport = await ticketApi.loadDailyReport({
        from_date: fromDate,
        to_date: toDate,
      });

      setMissingTicketNumbers(nextReport.missing_item_ticket_numbers);
      setReport(nextReport);
    } catch (error) {
      setReport(undefined);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to generate report.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <WindowLayout
      title="Daily Report"
      description="Generate detailed item records."
    >
      <GlobalStyles
        styles={{
          "@page": { margin: "8mm" },
          "@media print": {
            ".no-print": { display: "none !important" },
            "html, body, #root": {
              height: "auto !important",
              overflow: "visible !important",
            },
            body: { background: "#fff !important" },
          },
        }}
      />

      <Stack spacing={1.5} sx={{ minHeight: "100%" }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
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
              resetGeneratedReport();
            }}
            sx={{ width: 180 }}
          />
          <DateField
            format="YYYY-MM-DD"
            label="To"
            size="small"
            value={toDate}
            onValueChange={(value) => {
              setToDate(value);
              resetGeneratedReport();
            }}
            sx={{ width: 180 }}
          />
          <Button
            variant="contained"
            startIcon={
              loading ? <CircularProgress size={16} /> : <RefreshIcon />
            }
            disabled={loading}
            onClick={() => void generateReport()}
          >
            Generate
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            disabled={!report || loading}
            onClick={printReport}
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

        {missingTicketNumbers.length ? (
          <Alert
            severity="warning"
            className="no-print"
            sx={{ displayPrint: "none" }}
          >
            Missing items on ticket(s): {missingTicketNumbers.join(", ")}.
          </Alert>
        ) : null}

        {report ? (
          <ReportDocument
            title="Daily Report"
            fromDate={report.from_date}
            toDate={report.to_date}
            footer={
              <>
                <Typography variant="body2" fontWeight={800}>
                  TICKETS: {report.total_tickets}
                </Typography>
                <Typography variant="body2" fontWeight={800}>
                  ITEMS: {report.total_items}
                </Typography>
                <Typography variant="body2" fontWeight={900}>
                  TOTAL: {formatCurrency(report.total_amount)}
                </Typography>
              </>
            }
          >
            <TableContainer>
              <Table
                size="small"
                aria-label="daily pawn and sold item report"
                sx={{
                  tableLayout: "fixed",
                  "& th, & td": {
                    verticalAlign: "top",
                    overflowWrap: "anywhere",
                  },
                  "& thead": { displayPrint: "table-header-group" },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: "16%", fontWeight: 900 }}>
                      Ticket # / Item #
                    </TableCell>
                    <TableCell sx={{ width: "11%", fontWeight: 900 }}>
                      Amt / Qty
                    </TableCell>
                    <TableCell sx={{ width: "30%", fontWeight: 900 }}>
                      Description
                    </TableCell>
                    <TableCell sx={{ width: "43%", fontWeight: 900 }}>
                      Personal / Item Details
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.tickets.map((ticket) => (
                    <React.Fragment key={ticket.ticket_number}>
                      <TableRow
                        sx={{
                          breakInside: "avoid",
                          pageBreakInside: "avoid",
                          "& td": {
                            borderTop: "2px solid #444",
                            fontWeight: 700,
                          },
                        }}
                      >
                        <TableCell>
                          <strong>{ticket.ticket_number}</strong>
                        </TableCell>
                        <TableCell>
                          <strong>{formatCurrency(ticket.amount)}</strong>
                        </TableCell>
                        <TableCell>
                          <strong>{detailValue(ticket.description)}</strong>
                        </TableCell>
                        <TableCell>
                          {ticket.client_name || "UNKNOWN CLIENT"} |{" "}
                          {detailValue(ticket.gender)} |{" "}
                          {detailValue(ticket.eye_color)}
                          <br />
                          {detailValue(ticket.identifications)}
                        </TableCell>
                      </TableRow>

                      {ticket.items.map((item) => (
                        <TableRow
                          key={item.item_number}
                          sx={{
                            breakInside: "avoid",
                            pageBreakInside: "avoid",
                            "& td": { borderBottomColor: "#ddd" },
                          }}
                        >
                          <TableCell sx={{ pl: 4 }}>
                            {item.item_number}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{detailValue(item.description)}</TableCell>
                          <TableCell>
                            MAKE: {detailValue(item.brand_name)} | MODEL:{" "}
                            {detailValue(item.model_number)} | SERIAL:{" "}
                            {detailValue(item.serial_number)}
                          </TableCell>
                        </TableRow>
                      ))}

                      {!ticket.items.length ? (
                        <TableRow
                          sx={{
                            breakInside: "avoid",
                            pageBreakInside: "avoid",
                          }}
                        >
                          <TableCell />
                          <TableCell>0</TableCell>
                          <TableCell>NO ITEMS</TableCell>
                          <TableCell>NO ITEM DETAILS</TableCell>
                        </TableRow>
                      ) : null}
                    </React.Fragment>
                  ))}

                  {!report.tickets.length ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No pawn or sold tickets were found in this date range.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </ReportDocument>
        ) : !loading && !errorMessage ? (
          <Typography color="text.secondary">
            Select a date range and generate the report.
          </Typography>
        ) : null}
      </Stack>
    </WindowLayout>
  );
};

export default DailyReportWindow;
