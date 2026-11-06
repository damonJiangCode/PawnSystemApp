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
import { calculation } from "../../../../../shared/utils/calculation";
import {
  formatIsoDate,
  formatUppercase,
} from "../../../shared/utils/formatters";

const TicketExpireWindow: React.FC<WindowScreenProps> = () => {
  const ticketInputRef = React.useRef<HTMLInputElement>(null);
  const [ticketNumber, setTicketNumber] = React.useState("");
  const [searchResult, setSearchResult] =
    React.useState<TicketSearchResult | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [expiredTickets, setExpiredTickets] = React.useState<
    TicketSearchResult[]
  >([]);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [expiring, setExpiring] = React.useState(false);

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

      if (
        result.ticket.status !== "pawned" &&
        result.ticket.status !== "sold"
      ) {
        setError("Only pawned or sold tickets can be expired.");
        focusTicketField();
        return;
      }

      if (
        !result.ticket.due_date ||
        !calculation.isBeforeCalendarDate(result.ticket.due_date)
      ) {
        setError("This ticket is not past the due date yet.");
        focusTicketField();
        return;
      }

      setSearchResult(result);
      setDetailsOpen(true);
    } catch (err) {
      console.error(err);
      setError("Unable to search ticket right now.");
    } finally {
      setSearching(false);
    }
  };

  const handleExpire = async () => {
    if (!searchResult?.ticket.ticket_number) {
      setError("Search a ticket before expiring.");
      return;
    }

    setExpiring(true);
    setError("");
    setMessage("");

    try {
      const expiredTicket = await ticketApi.expireTicket({
        ticket_number: searchResult.ticket.ticket_number,
      });
      const expiredResult = {
        ...searchResult,
        ticket: expiredTicket,
      };

      setExpiredTickets((prev) => [expiredResult, ...prev]);
      setSearchResult(null);
      setDetailsOpen(false);
      setTicketNumber("");
      setMessage(`Ticket #${expiredTicket.ticket_number} expired.`);

      const channel = new BroadcastChannel("menu-events");
      channel.postMessage({
        type: "ticket-expired",
        ticket: expiredTicket,
        client: searchResult.client,
      });
      channel.close();

      focusTicketField();
    } catch (err) {
      console.error(err);
      const formError = err as TicketFormError;
      setError(formError.message || "Unable to expire ticket right now.");
    } finally {
      setExpiring(false);
    }
  };

  return (
    <WindowLayout
      title="Expire Ticket"
      description="Search tickets, confirm the details, then expire them."
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
              {expiredTickets.length ? (
                expiredTickets.map(({ ticket }) => (
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
                      Expired tickets will appear here.
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
            if (!expiring) {
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
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              autoFocus
              variant="contained"
              color="error"
              disabled={expiring}
              onClick={() => void handleExpire()}
            >
              {expiring ? "Expiring..." : "Expire"}
            </Button>
            <Button onClick={() => setDetailsOpen(false)} disabled={expiring}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </WindowLayout>
  );
};

export default TicketExpireWindow;
