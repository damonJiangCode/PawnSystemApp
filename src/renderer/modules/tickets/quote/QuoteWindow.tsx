import DateField from "../../../shared/components/DateField";
import PrintIcon from "@mui/icons-material/Print";
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
import React from "react";
import {
  formatCurrency,
  formatIsoDate,
} from "../../../shared/utils/formatters";
import WindowLayout from "../../../windows/WindowLayout";
import type { WindowScreenProps } from "../../../windows/windowRegistry";
import { useQuoteWindow } from "./useQuoteWindow";

const QuoteWindow: React.FC<WindowScreenProps> = () => {
  const { state, actions } = useQuoteWindow();
  const {
    input,
    today,
    quoteDate,
    rows,
    loading,
    errorMessage,
    totalInterestDue,
    totalPickupAmount,
  } = state;
  const clientName = [
    input.clientLastName,
    input.clientFirstName,
    input.clientMiddleName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <WindowLayout
      title="Quote"
      description="Preview pickup and interest amounts for the selected client."
      denseFooter
    >
      <GlobalStyles
        styles={{
          "@media print": {
            ".no-print": { display: "none !important" },
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
            label="Quote Date"
            size="small"
            value={quoteDate}
            onValueChange={actions.setQuoteDate}
            min={today}
            sx={{ width: 190 }}
          />
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={actions.print}
            disabled={loading || Boolean(errorMessage) || !rows.length}
          >
            Print / Save PDF
          </Button>
          {loading ? <CircularProgress size={22} /> : null}
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

        <Box sx={{ color: "#000", bgcolor: "#fff", px: 1, py: 0.5 }}>
          <Stack alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
            <Typography variant="h5" fontWeight={900}>
              QUOTE
            </Typography>
            <Stack
              direction="row"
              justifyContent="space-between"
              sx={{ width: "100%" }}
            >
              <Typography variant="body2" fontWeight={700}>
                NAME: {clientName.toUpperCase()}
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                DATE: {quoteDate}
              </Typography>
            </Stack>
          </Stack>

          <TableContainer>
            <Table size="small" aria-label="pickup quote">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Ticket</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Due Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>
                    Interest Due
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>
                    Pickup Amount
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length ? (
                  rows.map(({ ticket, items, interestDue, pickupAmount }) => (
                    <React.Fragment key={ticket.ticket_number}>
                      <TableRow sx={{ bgcolor: "#fafafa" }}>
                        <TableCell sx={{ fontWeight: 800 }}>
                          {ticket.ticket_number}
                        </TableCell>
                        <TableCell>{ticket.location}</TableCell>
                        <TableCell>{formatIsoDate(ticket.due_date)}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(interestDue)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          {formatCurrency(pickupAmount)}
                        </TableCell>
                      </TableRow>
                      {items.map((item, index) => (
                        <TableRow
                          key={`${ticket.ticket_number}-${item.item_number}-${index}`}
                        >
                          <TableCell />
                          <TableCell colSpan={4} sx={{ pl: 4, py: 0.8 }}>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{ lineHeight: 1.35 }}
                            >
                              {item.description || "ITEM"}
                            </Typography>
                            {(item.brand_name || item.model_number) && (
                              <Stack
                                direction="row"
                                spacing={3}
                                sx={{ mt: 0.25, color: "text.secondary" }}
                              >
                                {item.brand_name && (
                                  <Typography variant="caption">
                                    Brand: {item.brand_name}
                                  </Typography>
                                )}
                                {item.model_number && (
                                  <Typography variant="caption">
                                    Model: {item.model_number}
                                  </Typography>
                                )}
                              </Stack>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      {loading ? "Loading..." : "No pawned tickets found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack
            alignItems="flex-end"
            spacing={0.25}
            sx={{
              mt: 1.5,
              breakInside: "avoid",
              pageBreakInside: "avoid",
            }}
          >
            <Typography fontWeight={800}>
              Total Interest Due: {formatCurrency(totalInterestDue)}
            </Typography>
            <Typography variant="h6" fontWeight={900}>
              Total Pickup Amount: {formatCurrency(totalPickupAmount)}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </WindowLayout>
  );
};

export default QuoteWindow;
