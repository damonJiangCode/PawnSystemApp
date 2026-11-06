import type { ReportDateRangeInput } from "../../../../../shared/payload-contracts/ticket.contract.ts";
import { isValidDateKey } from "../../shared/isValidDateKey.ts";
import { loadXmlReportConfig } from "./xml-report.config.ts";
import { mapXmlReportTicket } from "./xml-report.mapper.ts";
import { xmlReportRepo } from "./xml-report.repo.ts";
import { xmlReportSoap } from "./xml-report.soap.ts";
import type { LeadsOnlineTicket } from "./xml-report.types.ts";

const validateTicket = (ticket: LeadsOnlineTicket) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ticket.items.Item.length) {
    errors.push("Ticket has no items.");
  }

  ticket.items.Item.forEach((item, index) => {
    if (!item.make && !item.model && !item.serialNumber && !item.description) {
      errors.push(`Item ${index + 1} has no identifying details.`);
    }
  });

  if (!ticket.customer.idNumber) warnings.push("Customer ID is missing.");
  if (!ticket.customer.address1) warnings.push("Customer address is missing.");
  if (!ticket.customer.phone) warnings.push("Customer phone is missing.");

  return { errors, warnings };
};

const validateDateRange = (input: ReportDateRangeInput) => {
  const fromDate = input.from_date?.trim() ?? "";
  const toDate = input.to_date?.trim() ?? "";

  if (!isValidDateKey(fromDate)) {
    throw new Error("Enter a valid From date.");
  }
  if (!isValidDateKey(toDate)) {
    throw new Error("Enter a valid To date.");
  }
  if (fromDate > toDate) {
    throw new Error("To date must be the same as or later than From date.");
  }

  return { fromDate, toDate };
};

const buildPreview = async (input: ReportDateRangeInput) => {
  const { fromDate, toDate } = validateDateRange(input);
  const sourceRows = await xmlReportRepo.loadSourceRows(fromDate, toDate);
  const groupedRows = new Map<number, typeof sourceRows>();

  for (const row of sourceRows) {
    const rows = groupedRows.get(row.ticket_number) ?? [];
    rows.push(row);
    groupedRows.set(row.ticket_number, rows);
  }

  const environment = loadXmlReportConfig().environment;
  const submissionMap = await xmlReportRepo.loadSubmissionMap(
    [...groupedRows.keys()],
    environment,
  );
  const tickets = [...groupedRows.values()].map((rows) => {
    const payload = mapXmlReportTicket(rows);
    const validation = validateTicket(payload);
    const submission = submissionMap.get(Number(payload.key.ticketnumber));

    return {
      payload,
      ...validation,
      submission_status: submission?.status ?? ("pending" as const),
      submission_message: submission?.message ?? "",
    };
  });

  return {
    from_date: fromDate,
    to_date: toDate,
    tickets,
    total_tickets: tickets.length,
    valid_tickets: tickets.filter((ticket) => !ticket.errors.length).length,
    invalid_tickets: tickets.filter((ticket) => ticket.errors.length).length,
  };
};

export const xmlReportService = {
  checkConnection: () => xmlReportSoap.checkLogin(),

  loadPreview: buildPreview,

  submitReport: async (input: ReportDateRangeInput) => {
    const preview = await buildPreview(input);
    if (!preview.total_tickets) {
      throw new Error("There are no tickets to submit for this date range.");
    }
    if (preview.invalid_tickets) {
      throw new Error("Fix all invalid tickets before submitting the report.");
    }

    const environment = loadXmlReportConfig().environment;
    const results = [];

    for (const ticket of preview.tickets) {
      const ticketNumber = Number(ticket.payload.key.ticketnumber);

      if (ticket.submission_status === "submitted") {
        results.push({
          ticket_number: ticketNumber,
          status: "skipped" as const,
          error_code: 0,
          message: "Already submitted.",
        });
        continue;
      }

      let result: {
        success: boolean;
        error_code: number;
        message: string;
      };

      try {
        result = await xmlReportSoap.submitTransaction(ticket.payload);
      } catch (error) {
        result = {
          success: false,
          error_code: -1,
          message:
            error instanceof Error
              ? error.message
              : "Unable to reach LeadsOnline.",
        };
      }

      const status = result.success ? "submitted" : "failed";
      await xmlReportRepo.saveSubmissionResult({
        ticket_number: ticketNumber,
        ticket_type: ticket.payload.key.ticketType,
        ticket_datetime: ticket.payload.key.ticketDateTime,
        environment,
        status,
        error_code: result.error_code,
        message: result.message,
      });
      results.push({
        ticket_number: ticketNumber,
        status,
        error_code: result.error_code,
        message: result.message,
      });
    }

    return {
      from_date: preview.from_date,
      to_date: preview.to_date,
      results,
      submitted_tickets: results.filter(
        (result) => result.status === "submitted",
      ).length,
      failed_tickets: results.filter((result) => result.status === "failed")
        .length,
      skipped_tickets: results.filter((result) => result.status === "skipped")
        .length,
    };
  },
};
