import React from "react";
import { Alert, Box, Button, Stack, TextField } from "@mui/material";
import WindowLayout from "../../../windows/WindowLayout";
import type { WindowScreenProps } from "../../../windows/windowRegistry";
import { ticketApi } from "../ticket.api";

const ticketSearchHistoryStatuses = new Set([
  "pawned_expired",
  "pawned_picked_up",
  "sold_expired",
]);

const TicketSearchWindow: React.FC<WindowScreenProps> = () => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [ticketNumber, setTicketNumber] = React.useState("");
  const [error, setError] = React.useState("");
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const focusTicketInput = () => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const handleSearch = async () => {
    const normalizedTicketNumber = Number(ticketNumber);

    if (
      !Number.isFinite(normalizedTicketNumber) ||
      normalizedTicketNumber <= 0
    ) {
      setError("Enter a valid ticket number.");
      focusTicketInput();
      return;
    }

    setSearching(true);
    setError("");

    try {
      const result = await ticketApi.searchTicketByNumber(normalizedTicketNumber);

      if (!result) {
        setError("No ticket was found for that number.");
        focusTicketInput();
        return;
      }

      const targetTab = ticketSearchHistoryStatuses.has(result.ticket.status)
        ? "history"
        : "transaction";
      const channel = new BroadcastChannel("menu-events");

      channel.postMessage({
        type: "ticket-search-selected",
        ticket: result.ticket,
        client: result.client,
        targetTab,
      });
      channel.close();
      window.close();
    } catch (err) {
      console.error(err);
      setError("Unable to search ticket right now.");
      focusTicketInput();
    } finally {
      setSearching(false);
    }
  };

  return (
    <WindowLayout
      title="Search Ticket"
      description="Search tickets by ticket number."
    >
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSearch();
        }}
        sx={{ maxWidth: 460, pt: 0.5 }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            inputRef={inputRef}
            fullWidth
            size="small"
            label="Ticket Number"
            value={ticketNumber}
            onChange={(event) => {
              setTicketNumber(event.target.value.replace(/\D/g, ""));
              setError("");
            }}
            inputProps={{ inputMode: "numeric" }}
            error={Boolean(error)}
            helperText={error || " "}
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
        <Alert severity="info" sx={{ mt: 1 }}>
          Found tickets will open on Transaction or History automatically.
        </Alert>
      </Box>
    </WindowLayout>
  );
};

export default TicketSearchWindow;
