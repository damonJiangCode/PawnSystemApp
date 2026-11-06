import DateField from "../../../shared/components/DateField";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import PreviewIcon from "@mui/icons-material/Preview";
import SendIcon from "@mui/icons-material/Send";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import type {
  XmlReportConnectionResult,
  XmlReportPreviewResult,
  XmlReportSubmissionResult,
} from "../../../../../shared/payload-contracts/xmlReport.contract";
import { getAppApi } from "../../../shared/api/app.api";
import {
  formatCurrency,
  formatIsoDate,
} from "../../../shared/utils/formatters";
import WindowLayout from "../../../windows/WindowLayout";
import type { WindowScreenProps } from "../../../windows/windowRegistry";

const XmlReportWindow = (_props: WindowScreenProps) => {
  const today = useMemo(() => formatIsoDate(new Date()), []);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [connection, setConnection] = useState<XmlReportConnectionResult>();
  const [preview, setPreview] = useState<XmlReportPreviewResult>();
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] =
    useState<XmlReportSubmissionResult>();
  const [errorMessage, setErrorMessage] = useState("");

  const checkConnection = async () => {
    const api = getAppApi()?.xmlReport;
    if (!api) {
      setErrorMessage("XML Report API is unavailable.");
      return;
    }

    setIsChecking(true);
    setErrorMessage("");
    try {
      setConnection(await api.checkConnection());
    } catch (error) {
      setConnection(undefined);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to check connection.",
      );
    } finally {
      setIsChecking(false);
    }
  };

  const loadPreview = async () => {
    const api = getAppApi()?.xmlReport;
    if (!api) {
      setErrorMessage("XML Report API is unavailable.");
      return;
    }
    if (!fromDate || !toDate || fromDate > toDate) {
      setErrorMessage("Select a valid From and To date range.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSubmissionResult(undefined);
    try {
      setPreview(
        await api.loadPreview({ from_date: fromDate, to_date: toDate }),
      );
    } catch (error) {
      setPreview(undefined);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load preview.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const submitReport = async () => {
    const api = getAppApi()?.xmlReport;
    if (!api || !preview) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSubmissionResult(undefined);
    try {
      const result = await api.submitReport({
        from_date: fromDate,
        to_date: toDate,
      });
      setSubmissionResult(result);
      setPreview(
        await api.loadPreview({ from_date: fromDate, to_date: toDate }),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to submit report.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = Boolean(
    preview &&
    preview.total_tickets > 0 &&
    preview.invalid_tickets === 0 &&
    preview.tickets.some(
      (ticket) => ticket.submission_status !== "submitted",
    ) &&
    !isSubmitting,
  );

  return (
    <WindowLayout
      title="XML Report"
      description="Validate LeadsOnline transactions before submission."
      footerActions={
        <Button
          variant="contained"
          startIcon={
            isSubmitting ? <CircularProgress size={16} /> : <SendIcon />
          }
          disabled={!canSubmit}
          onClick={() => void submitReport()}
        >
          Submit
        </Button>
      }
    >
      <Stack spacing={1.5} sx={{ minHeight: "100%" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <DateField
            format="YYYY-MM-DD"
            label="From"
            size="small"
            value={fromDate}
            onValueChange={(value) => {
              setFromDate(value);
              setPreview(undefined);
              setSubmissionResult(undefined);
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
              setPreview(undefined);
              setSubmissionResult(undefined);
            }}
            sx={{ width: 180 }}
          />
          <Button
            variant="outlined"
            startIcon={
              isChecking ? <CircularProgress size={16} /> : <CloudDoneIcon />
            }
            disabled={isChecking}
            onClick={() => void checkConnection()}
          >
            Check Connection
          </Button>
          <Button
            variant="contained"
            startIcon={
              isLoading ? <CircularProgress size={16} /> : <PreviewIcon />
            }
            disabled={isLoading}
            onClick={() => void loadPreview()}
          >
            Generate Preview
          </Button>
        </Stack>

        {connection ? (
          <Alert severity={connection.connected ? "success" : "error"}>
            {connection.environment.toUpperCase()}: {connection.message}
          </Alert>
        ) : null}

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        {submissionResult ? (
          <Alert
            severity={submissionResult.failed_tickets ? "warning" : "success"}
          >
            Submitted: {submissionResult.submitted_tickets}. Failed:{" "}
            {submissionResult.failed_tickets}. Skipped:{" "}
            {submissionResult.skipped_tickets}.
          </Alert>
        ) : null}

        {preview ? (
          <>
            <Stack direction="row" spacing={3}>
              <Typography fontWeight={800}>
                TICKETS: {preview.total_tickets}
              </Typography>
              <Typography color="success.main" fontWeight={800}>
                VALID: {preview.valid_tickets}
              </Typography>
              <Typography
                color={preview.invalid_tickets ? "error.main" : "text.primary"}
                fontWeight={800}
              >
                INVALID: {preview.invalid_tickets}
              </Typography>
            </Stack>

            <TableContainer sx={{ flex: 1 }}>
              <Table size="small" stickyHeader aria-label="XML Report preview">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Ticket #</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Items</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Validation</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.tickets.map(
                    ({
                      payload,
                      errors,
                      warnings,
                      submission_status: submissionStatus,
                      submission_message: submissionMessage,
                    }) => (
                      <TableRow key={payload.key.ticketnumber}>
                        <TableCell>{payload.key.ticketnumber}</TableCell>
                        <TableCell>{payload.key.ticketType}</TableCell>
                        <TableCell>{payload.key.ticketDateTime}</TableCell>
                        <TableCell>{payload.customer.name}</TableCell>
                        <TableCell>{payload.items.Item.length}</TableCell>
                        <TableCell>
                          {formatCurrency(
                            Number(
                              payload.extraTicket.PropertyValue.find(
                                (value) => value.Name === "TICKET_LOAN_AMOUNT",
                              )?.Value ?? 0,
                            ),
                          )}
                        </TableCell>
                        <TableCell>
                          {errors.length ? (
                            <Typography variant="body2" color="error.main">
                              {errors.join(" ")}
                            </Typography>
                          ) : submissionStatus === "submitted" ? (
                            <Typography variant="body2" color="success.main">
                              Submitted
                            </Typography>
                          ) : submissionStatus === "failed" ? (
                            <Typography variant="body2" color="error.main">
                              Failed: {submissionMessage}
                            </Typography>
                          ) : warnings.length ? (
                            <Typography variant="body2" color="warning.main">
                              {warnings.join(" ")}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="success.main">
                              Ready
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <Box sx={{ color: "text.secondary" }}>
            Generate a preview to validate tickets before uploading.
          </Box>
        )}
      </Stack>
    </WindowLayout>
  );
};

export default XmlReportWindow;
