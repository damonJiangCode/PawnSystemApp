import React from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import WindowLayout from "../../../windows/WindowLayout";
import type { WindowScreenProps } from "../../../windows/windowRegistry";
import type { TicketSearchResult } from "../../../../../shared/payload-contracts/ticket.contract";
import type { TicketFormError } from "../ticket.api";
import { ticketApi } from "../ticket.api";
import {
  formatIsoDate,
  formatUppercase,
} from "../../../shared/utils/formatters";

const TicketStolenWindow: React.FC<WindowScreenProps> = () => {
  const ticketInputRef = React.useRef<HTMLInputElement>(null);
  const passwordInputRef = React.useRef<HTMLInputElement>(null);
  const [ticketNumber, setTicketNumber] = React.useState("");
  const [employeePassword, setEmployeePassword] = React.useState("");
  const [searchResult, setSearchResult] =
    React.useState<TicketSearchResult | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [stolenTickets, setStolenTickets] = React.useState<
    TicketSearchResult[]
  >([]);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [marking, setMarking] = React.useState(false);

  const focusTicketField = React.useCallback(() => {
    window.setTimeout(() => {
      ticketInputRef.current?.focus();
      ticketInputRef.current?.select();
    }, 0);
  }, []);

  React.useEffect(() => {
    window.resizeTo(860, 680);

    const frame = requestAnimationFrame(() => {
      ticketInputRef.current?.focus();
      ticketInputRef.current?.select();
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  React.useEffect(() => {
    if (!detailsOpen) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      passwordInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [detailsOpen]);

  const handleSearch = async () => {
    const normalizedTicketNumber = Number(ticketNumber);

    if (
      !Number.isFinite(normalizedTicketNumber) ||
      normalizedTicketNumber <= 0
    ) {
      setError("Enter a valid ticket number.");
      return;
    }

    setSearching(true);
    setError("");
    setMessage("");
    setSearchResult(null);

    try {
      const result = await ticketApi.searchTicketByNumber(
        normalizedTicketNumber,
      );

      if (!result) {
        setError("No ticket was found for that number.");
        focusTicketField();
        return;
      }

      if (result.ticket.is_stolen) {
        setError(
          `Ticket #${result.ticket.ticket_number} is already marked stolen.`,
        );
        focusTicketField();
        return;
      }

      setSearchResult(result);
      setDetailsOpen(true);
      setEmployeePassword("");
      requestAnimationFrame(() => {
        passwordInputRef.current?.focus();
      });
    } catch (err) {
      console.error(err);
      setError("Unable to search ticket right now.");
    } finally {
      setSearching(false);
    }
  };

  const handleMarkStolen = async () => {
    if (!searchResult?.ticket.ticket_number) {
      setError("Search a ticket before marking it stolen.");
      return;
    }

    if (!employeePassword.trim()) {
      setError("Enter employee password.");
      passwordInputRef.current?.focus();
      return;
    }

    setMarking(true);
    setError("");
    setMessage("");

    try {
      const stolenTicket = await ticketApi.markTicketStolen({
        ticket_number: searchResult.ticket.ticket_number,
        employee_password: employeePassword,
      });
      const stolenResult = {
        ...searchResult,
        ticket: stolenTicket,
      };

      setStolenTickets((prev) => [stolenResult, ...prev]);
      setSearchResult(null);
      setDetailsOpen(false);
      setTicketNumber("");
      setEmployeePassword("");
      setMessage(`Ticket #${stolenTicket.ticket_number} marked stolen.`);

      const channel = new BroadcastChannel("menu-events");
      channel.postMessage({
        type: "ticket-stolen",
        ticket: stolenTicket,
        client: searchResult.client,
      });
      channel.close();

      focusTicketField();
    } catch (err) {
      console.error(err);
      const formError = err as TicketFormError;
      setError(formError.message || "Unable to mark ticket stolen right now.");
    } finally {
      setMarking(false);
    }
  };

  return (
    <WindowLayout
      title="Mark Ticket Stolen"
      description="Search a ticket, confirm the details, then mark it stolen."
    >
      <Stack spacing={1} sx={{ height: "100%", minHeight: 0 }}>
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSearch();
          }}
          sx={{ pt: 0.5 }}
        >
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              inputRef={ticketInputRef}
              size="small"
              label="Ticket Number"
              value={ticketNumber}
              onChange={(event) => {
                setTicketNumber(event.target.value.replace(/\D/g, ""));
                setError("");
              }}
              inputProps={{ inputMode: "numeric" }}
              sx={{ width: 220 }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={searching}
              sx={{ minWidth: 96 }}
            >
              Search
            </Button>
          </Stack>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}

        <Paper
          variant="outlined"
          sx={{ flex: 1, minHeight: 0, overflow: "auto" }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Ticket #</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stolenTickets.length ? (
                stolenTickets.map(({ ticket }) => (
                  <TableRow key={ticket.ticket_number}>
                    <TableCell>{ticket.ticket_number}</TableCell>
                    <TableCell>{ticket.location}</TableCell>
                    <TableCell>{ticket.description}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography color="text.secondary" variant="body2">
                      Stolen tickets will appear here.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        <Dialog
          open={detailsOpen && Boolean(searchResult)}
          disableRestoreFocus
          onClose={() => {
            if (!marking) {
              setDetailsOpen(false);
            }
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Ticket #{searchResult?.ticket.ticket_number ?? ""}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={1.25} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                size="small"
                label="Name"
                value={
                  searchResult
                    ? `${formatUppercase(searchResult.client.last_name)}, ${formatUppercase(searchResult.client.first_name)}`
                    : ""
                }
                disabled
                fullWidth
              />
              <TextField
                size="small"
                label="Description"
                value={searchResult?.ticket.description ?? ""}
                disabled
                fullWidth
              />
              <TextField
                size="small"
                label="Due Date"
                value={formatIsoDate(searchResult?.ticket.due_date)}
                disabled
                fullWidth
              />
              <TextField
                inputRef={passwordInputRef}
                size="small"
                type="password"
                label="Employee Password"
                value={employeePassword}
                onChange={(event) => {
                  setEmployeePassword(event.target.value);
                  setError("");
                }}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              color="error"
              disabled={marking}
              onClick={() => void handleMarkStolen()}
            >
              {marking ? "Saving..." : "Mark Stolen"}
            </Button>
            <Button onClick={() => setDetailsOpen(false)} disabled={marking}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </WindowLayout>
  );
};

export default TicketStolenWindow;
