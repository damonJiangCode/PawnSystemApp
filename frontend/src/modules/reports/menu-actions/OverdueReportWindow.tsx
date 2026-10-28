import DateField from "../../../shared/components/DateField";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  GlobalStyles,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import type { Ticket } from "../../../../../shared/models/ticket.model";
import type { OverdueReportTicket } from "../../../../../shared/payload-contracts/ticket.contract";
import { ticketApi } from "../../tickets/ticket.api";
import { getAppApi } from "../../../shared/api/app.api";
import { formatIsoDate } from "../../../shared/utils/formatters";
import WindowLayout from "../../../windows/WindowLayout";
import type { WindowScreenProps } from "../../../windows/windowRegistry";
import ReportDocument from "../components/ReportDocument";
import { referenceApi } from "../../reference/reference.api";

const valueOrDash = (value: string) => value || "---";

const historyStatuses = new Set<Ticket["status"]>([
  "pawned_expired",
  "pawned_picked_up",
  "sold_expired",
]);

const groupTicketsByLocation = (tickets: OverdueReportTicket[]) => {
  const groups = new Map<string, OverdueReportTicket[]>();

  for (const ticket of tickets) {
    const locationTickets = groups.get(ticket.location) ?? [];
    locationTickets.push(ticket);
    groups.set(ticket.location, locationTickets);
  }

  return [...groups.entries()];
};

const OverdueReportWindow: React.FC<WindowScreenProps> = () => {
  const today = useMemo(() => formatIsoDate(new Date()), []);
  const [dueOnOrBefore, setDueOnOrBefore] = useState(today);
  const [locationFrom, setLocationFrom] = useState("");
  const [locationTo, setLocationTo] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [report, setReport] =
    useState<Awaited<ReturnType<typeof ticketApi.loadOverdueReport>>>();
  const [loading, setLoading] = useState(false);
  const [openingTicketNumber, setOpeningTicketNumber] = useState<number>();
  const [errorMessage, setErrorMessage] = useState("");

  const clearReport = () => {
    setReport(undefined);
    setErrorMessage("");
  };

  useEffect(() => {
    let active = true;

    const loadLocations = async () => {
      setLocationsLoading(true);

      try {
        const nextLocations = await referenceApi.loadLocations();

        if (active) {
          setLocations(nextLocations);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load locations.",
          );
        }
      } finally {
        if (active) {
          setLocationsLoading(false);
        }
      }
    };

    void loadLocations();

    return () => {
      active = false;
    };
  }, []);

  const generateReport = async () => {
    if (!dueOnOrBefore || !locationFrom.trim() || !locationTo.trim()) {
      setErrorMessage("Select a date and enter both location values.");
      return;
    }

    if (!locations.includes(locationFrom) || !locations.includes(locationTo)) {
      setErrorMessage("Select valid From and To locations from the list.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      setReport(
        await ticketApi.loadOverdueReport({
          due_on_or_before: dueOnOrBefore,
          location_from: locationFrom,
          location_to: locationTo,
        }),
      );
    } catch (error) {
      setReport(undefined);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to generate report.",
      );
    } finally {
      setLoading(false);
    }
  };

  const goToTicket = async (ticketNumber: number) => {
    setOpeningTicketNumber(ticketNumber);
    setErrorMessage("");

    try {
      const result = await ticketApi.searchTicketByNumber(ticketNumber);

      if (!result) {
        setErrorMessage(`Ticket #${ticketNumber} was not found.`);
        return;
      }

      const channel = new BroadcastChannel("menu-events");
      channel.postMessage({
        type: "ticket-search-selected",
        ticket: result.ticket,
        client: result.client,
        targetTab: historyStatuses.has(result.ticket.status)
          ? "history"
          : "transaction",
      });
      channel.close();
      await getAppApi()?.window.focusMainWindow();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to open ticket.",
      );
    } finally {
      setOpeningTicketNumber(undefined);
    }
  };

  const hasTickets = Boolean(report?.tickets.length);
  const locationGroups = useMemo(
    () => groupTicketsByLocation(report?.tickets ?? []),
    [report],
  );

  return (
    <WindowLayout
      title="Overdue Report"
      description="Review overdue pawn tickets by location range."
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
            label="Due On or Before"
            size="small"
            value={dueOnOrBefore}
            onValueChange={(value) => {
              setDueOnOrBefore(value);
              clearReport();
            }}
            sx={{ width: 190 }}
          />
          <Autocomplete
            value={locationFrom}
            options={locations}
            disableClearable
            disabled={locationsLoading}
            onChange={(_event, newValue) => {
              setLocationFrom(newValue || "");
              clearReport();
            }}
            onInputChange={(_event, inputValue, reason) => {
              if (reason === "input") {
                setLocationFrom(inputValue.toUpperCase());
                clearReport();
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Location From"
                placeholder="AA11"
                size="small"
              />
            )}
            sx={{ width: 155 }}
          />
          <Autocomplete
            value={locationTo}
            options={locations}
            disableClearable
            disabled={locationsLoading}
            onChange={(_event, newValue) => {
              setLocationTo(newValue || "");
              clearReport();
            }}
            onInputChange={(_event, inputValue, reason) => {
              if (reason === "input") {
                setLocationTo(inputValue.toUpperCase());
                clearReport();
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Location To"
                placeholder="AA78"
                size="small"
              />
            )}
            sx={{ width: 155 }}
          />
          <Button
            variant="contained"
            startIcon={
              loading ? <CircularProgress size={16} /> : <RefreshIcon />
            }
            disabled={loading || locationsLoading}
            onClick={() => void generateReport()}
          >
            Generate
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            disabled={!hasTickets || loading}
            onClick={() => window.print()}
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
            title="Overdue Report"
            fromDate={report.due_on_or_before}
            toDate={report.due_on_or_before}
            dateSummary={`DUE ON OR BEFORE: ${report.due_on_or_before}   LOCATIONS: ${report.location_from} - ${report.location_to}`}
            footer={
              <>
                <Typography variant="body2" fontWeight={800}>
                  TICKETS: {report.total_tickets}
                </Typography>
                <Typography variant="body2" fontWeight={800}>
                  ITEMS: {report.total_items}
                </Typography>
              </>
            }
          >
            <TableContainer>
              <Table
                size="small"
                aria-label="overdue pawn ticket report"
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
                    <TableCell sx={{ width: "18%", fontWeight: 900 }}>
                      Ticket #
                    </TableCell>
                    <TableCell sx={{ width: "25%", fontWeight: 900 }}>
                      Customer / Item
                    </TableCell>
                    <TableCell sx={{ width: "19%", fontWeight: 900 }}>
                      Pawn Date / Make
                    </TableCell>
                    <TableCell sx={{ width: "19%", fontWeight: 900 }}>
                      Due Date / Model
                    </TableCell>
                    <TableCell sx={{ width: "19%", fontWeight: 900 }}>
                      Months Paid / Serial #
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {locationGroups.length ? (
                    locationGroups.map(([location, tickets]) => (
                      <React.Fragment key={location}>
                        <TableRow
                          sx={{
                            breakAfter: "avoid",
                            pageBreakAfter: "avoid",
                            "& td": {
                              borderTop: "3px solid #222",
                              borderBottom: "1px solid #666",
                              py: 0.75,
                              fontSize: "1rem",
                              fontWeight: 900,
                            },
                          }}
                        >
                          <TableCell colSpan={5}>
                            LOCATION: {location}
                          </TableCell>
                        </TableRow>

                        {tickets.map((ticket) => (
                          <React.Fragment key={ticket.ticket_number}>
                            <TableRow
                              sx={{
                                breakInside: "avoid",
                                pageBreakInside: "avoid",
                                "& td": {
                                  borderBottom: ticket.items.length
                                    ? "none"
                                    : "1px solid #999",
                                  fontWeight: 700,
                                },
                              }}
                            >
                              <TableCell>
                                <Link
                                  component="button"
                                  type="button"
                                  underline="always"
                                  className="no-print"
                                  disabled={
                                    openingTicketNumber === ticket.ticket_number
                                  }
                                  onClick={() =>
                                    void goToTicket(ticket.ticket_number)
                                  }
                                  sx={{
                                    fontWeight: 900,
                                    verticalAlign: "baseline",
                                  }}
                                >
                                  {ticket.ticket_number}{" "}
                                  <OpenInNewIcon sx={{ fontSize: 12 }} />
                                </Link>
                                <Typography
                                  component="span"
                                  sx={{
                                    display: "none",
                                    displayPrint: "inline",
                                    fontSize: "inherit",
                                    fontWeight: 900,
                                  }}
                                >
                                  {ticket.ticket_number}
                                </Typography>
                              </TableCell>
                              <TableCell>{ticket.client_name}</TableCell>
                              <TableCell>{ticket.transaction_date}</TableCell>
                              <TableCell>{ticket.due_date}</TableCell>
                              <TableCell>
                                {ticket.interest_paid_months}
                              </TableCell>
                            </TableRow>

                            {ticket.items.map((item, index) => (
                              <TableRow
                                key={`${ticket.ticket_number}-${index}`}
                                sx={{
                                  breakInside: "avoid",
                                  pageBreakInside: "avoid",
                                  "& td": {
                                    borderBottom:
                                      index === ticket.items.length - 1
                                        ? "1px solid #999"
                                        : "none",
                                  },
                                }}
                              >
                                <TableCell />
                                <TableCell sx={{ pl: 3 }}>
                                  {valueOrDash(item.description)}
                                </TableCell>
                                <TableCell>
                                  {valueOrDash(item.brand_name)}
                                </TableCell>
                                <TableCell>
                                  {valueOrDash(item.model_number)}
                                </TableCell>
                                <TableCell>
                                  {valueOrDash(item.serial_number)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No overdue pawn tickets found for these filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </ReportDocument>
        ) : (
          <Typography color="text.secondary">
            Select a due date and location range, then generate the report.
          </Typography>
        )}
      </Stack>
    </WindowLayout>
  );
};

export default OverdueReportWindow;
