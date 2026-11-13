import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { ReportDateRangeQueryDto } from '../report/report.dto.js';
import { requireValidReportRange } from '../report/report-range.js';
import { LeadsOnlineClient } from './leadsonline.client.js';
import { LeadsOnlineConfig } from './leadsonline.config.js';
import { mapXmlReportTicket } from './xml-report.mapper.js';
import {
  XmlReportRepository,
  type XmlReportSourceRow,
} from './xml-report.repository.js';
import type { LeadsOnlineTicket } from './xml-report.types.js';

type SubmitStatus = 'submitted' | 'failed' | 'skipped';

// Errors block the submit; warnings are only shown.
const checkTicket = (ticket: LeadsOnlineTicket) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ticket.items.Item.length) errors.push('Ticket has no items.');
  ticket.items.Item.forEach((item, index) => {
    if (!item.make && !item.model && !item.serialNumber && !item.description) {
      errors.push(`Item ${index + 1} has no identifying details.`);
    }
  });

  if (!ticket.customer.idNumber) warnings.push('Customer ID is missing.');
  if (!ticket.customer.address1) warnings.push('Customer address is missing.');
  if (!ticket.customer.phone) warnings.push('Customer phone is missing.');

  return { errors, warnings };
};

// Item rows -> rows of each ticket, keeping the SQL order.
const groupByTicket = (rows: XmlReportSourceRow[]) => {
  const tickets = new Map<number, XmlReportSourceRow[]>();
  for (const row of rows) {
    const ticketRows = tickets.get(row.ticket_number) ?? [];
    ticketRows.push(row);
    tickets.set(row.ticket_number, ticketRows);
  }
  return [...tickets.values()];
};

@Injectable()
export class XmlReportService {
  constructor(
    private readonly repository: XmlReportRepository,
    private readonly config: LeadsOnlineConfig,
    private readonly leadsOnline: LeadsOnlineClient,
  ) {}

  async checkConnection() {
    const result = await this.leadsOnline.checkLogin();
    return {
      environment: this.config.environment,
      connected: result.success,
      error_code: result.error_code,
      message: result.message,
    };
  }

  // The tickets of the range as they would be sent, with problems and the
  // last submission status in the current LeadsOnline environment.
  async loadPreview(range: ReportDateRangeQueryDto) {
    requireValidReportRange(range);
    const rows = await this.repository.loadSourceRows(
      range.from_date,
      range.to_date,
    );
    const ticketRows = groupByTicket(rows);
    const submissions = await this.repository.loadSubmissions(
      ticketRows.map((rowsOfTicket) => rowsOfTicket[0].ticket_number),
      this.config.environment,
    );

    const tickets = ticketRows.map((rowsOfTicket) => {
      const payload = mapXmlReportTicket(rowsOfTicket);
      const submission = submissions.get(rowsOfTicket[0].ticket_number);
      return {
        payload,
        ...checkTicket(payload),
        submission_status: submission?.status ?? ('pending' as const),
        submission_message: submission?.message ?? '',
      };
    });
    const invalid = tickets.filter((ticket) => ticket.errors.length).length;

    return {
      from_date: range.from_date,
      to_date: range.to_date,
      tickets,
      total_tickets: tickets.length,
      valid_tickets: tickets.length - invalid,
      invalid_tickets: invalid,
    };
  }

  // Sends every ticket of the range that is not submitted yet, one at a time,
  // and records each result. A failed ticket does not stop the others.
  async submit(range: ReportDateRangeQueryDto) {
    this.config.login(); // 503 before doing anything if LeadsOnline is not set up

    const outcome = await this.repository.withSubmitLock(() =>
      this.submitUnlocked(range),
    );
    if (!outcome) {
      throw new ConflictException(
        'A LeadsOnline submission is already running. Wait for it to finish.',
      );
    }
    return outcome;
  }

  private async submitUnlocked(range: ReportDateRangeQueryDto) {
    // Reloaded inside the lock, so statuses saved by an earlier submit count.
    const preview = await this.loadPreview(range);
    if (!preview.total_tickets) {
      throw new BadRequestException(
        'There are no tickets to submit for this date range.',
      );
    }
    if (preview.invalid_tickets) {
      throw new BadRequestException(
        'Fix all invalid tickets before submitting the report.',
      );
    }

    const results: {
      ticket_number: number;
      status: SubmitStatus;
      error_code: number;
      message: string;
    }[] = [];

    for (const { payload, submission_status } of preview.tickets) {
      const ticketNumber = Number(payload.key.ticketnumber);
      if (submission_status === 'submitted') {
        results.push({
          ticket_number: ticketNumber,
          status: 'skipped',
          error_code: 0,
          message: 'Already submitted.',
        });
        continue;
      }

      const result = await this.leadsOnline.submitTicket(payload);
      const status = result.success ? 'submitted' : 'failed';
      await this.repository.saveSubmissionResult({
        ticket_number: ticketNumber,
        ticket_type: payload.key.ticketType,
        ticket_datetime: payload.key.ticketDateTime,
        environment: this.config.environment,
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

    const count = (status: SubmitStatus) =>
      results.filter((result) => result.status === status).length;
    return {
      from_date: range.from_date,
      to_date: range.to_date,
      results,
      submitted_tickets: count('submitted'),
      failed_tickets: count('failed'),
      skipped_tickets: count('skipped'),
    };
  }
}
