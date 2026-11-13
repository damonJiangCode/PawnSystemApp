import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  OverdueReportQueryDto,
  ReportDateRangeQueryDto,
} from './report.dto.js';
import {
  type OverdueLocationFilter,
  ReportRepository,
} from './report.repository.js';
import {
  LETTERED_LOCATION_PATTERN,
  SHELF_LOCATION_PATTERN,
} from './report-location.js';

type DailyReportTicket = {
  ticket_number: number;
  amount: number;
  description: string;
  client_name: string;
  gender: string;
  eye_color: string;
  identifications: string;
  items: {
    item_number: number;
    quantity: number;
    description: string;
    brand_name: string;
    model_number: string;
    serial_number: string;
    amount: number;
  }[];
};

const fieldError = (field: string, message: string) =>
  new BadRequestException({ field, message });

type OverdueReportTicket = {
  ticket_number: number;
  client_name: string;
  location: string;
  transaction_date: string;
  due_date: string;
  interest_paid_months: number;
  items: {
    description: string;
    brand_name: string;
    model_number: string;
    serial_number: string;
  }[];
};

// AB11 -> shelf ['AB', 11]; RR-A -> lettered ['RR', 'A']; AK -> single.
type ParsedLocation =
  | { kind: 'shelf'; key: [string, number] }
  | { kind: 'lettered'; key: [string, string] }
  | { kind: 'single' };

const shelfLocation = new RegExp(SHELF_LOCATION_PATTERN);
const letteredLocation = new RegExp(LETTERED_LOCATION_PATTERN);

const parseLocation = (code: string): ParsedLocation => {
  const shelf = shelfLocation.exec(code);
  if (shelf) return { kind: 'shelf', key: [shelf[1], Number(shelf[2])] };
  const lettered = letteredLocation.exec(code);
  if (lettered) return { kind: 'lettered', key: [lettered[1], lettered[2]] };
  return { kind: 'single' };
};

// Compares (first, second) keys the same way the SQL row comparison does.
const isKeyAfter = <T extends string | number>(
  a: [string, T],
  b: [string, T],
) => (a[0] === b[0] ? a[1] > b[1] : a[0] > b[0]);

// Reason some days in the range have no interest records, or null when none are missing.
const interestRecordsNote = (
  fromDate: string,
  recordsStartDate: string | null,
) => {
  if (recordsStartDate === null) {
    return 'No interest payments have been recorded yet.';
  }
  return fromDate < recordsStartDate
    ? `Interest payments are recorded from ${recordsStartDate}; earlier days have no records.`
    : null;
};

const roundMoney = (value: number) => Number(value.toFixed(2));

// The same day one year later (Feb 29 rolls to Mar 1), as YYYY-MM-DD.
const oneYearAfter = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year + 1, month - 1, day))
    .toISOString()
    .slice(0, 10);
};

@Injectable()
export class ReportService {
  constructor(private readonly repository: ReportRepository) {}

  async loadDaily(range: ReportDateRangeQueryDto) {
    this.requireValidRange(range);
    const rows = await this.repository.loadDailyRows(
      range.from_date,
      range.to_date,
    );

    // Group the item rows under their ticket, keeping the SQL order.
    const tickets = new Map<number, DailyReportTicket>();
    for (const row of rows) {
      let ticket = tickets.get(row.ticket_number);
      if (!ticket) {
        ticket = {
          ticket_number: row.ticket_number,
          amount: row.ticket_amount,
          description: row.ticket_description,
          client_name: row.client_name,
          gender: row.gender,
          eye_color: row.eye_color,
          identifications: row.identifications,
          items: [],
        };
        tickets.set(row.ticket_number, ticket);
      }
      if (row.item_number !== null) {
        ticket.items.push({
          item_number: row.item_number,
          quantity: row.quantity,
          description: row.item_description,
          brand_name: row.brand_name,
          model_number: row.model_number,
          serial_number: row.serial_number,
          amount: row.item_amount,
        });
      }
    }

    const list = [...tickets.values()];
    return {
      from_date: range.from_date,
      to_date: range.to_date,
      tickets: list,
      missing_item_ticket_numbers: list
        .filter((ticket) => ticket.items.length === 0)
        .map((ticket) => ticket.ticket_number),
      total_tickets: list.length,
      total_items: list.reduce(
        (sum, ticket) =>
          sum + ticket.items.reduce((count, item) => count + item.quantity, 0),
        0,
      ),
      total_amount: roundMoney(
        list.reduce((sum, ticket) => sum + ticket.amount, 0),
      ),
    };
  }

  async loadBuyback(range: ReportDateRangeQueryDto) {
    this.requireValidRange(range);
    const rows = await this.repository.loadBuybackRows(
      range.from_date,
      range.to_date,
    );
    const list = rows.map((row) => ({
      ...row,
      pickup_amount_paid: roundMoney(row.pickup_amount_paid),
    }));

    return {
      from_date: range.from_date,
      to_date: range.to_date,
      rows: list,
      total_buyback_price: roundMoney(
        list.reduce((sum, row) => sum + row.pickup_amount_paid, 0),
      ),
    };
  }

  async loadInterest(range: ReportDateRangeQueryDto) {
    this.requireValidRange(range);
    // interest_payment is only written by this system, so days before the
    // first recorded payment have no data; records_note tells the user so.
    const [rows, recordsStartDate] = await Promise.all([
      this.repository.loadInterestRows(range.from_date, range.to_date),
      this.repository.loadInterestRecordsStartDate(),
    ]);

    return {
      from_date: range.from_date,
      to_date: range.to_date,
      records_start_date: recordsStartDate,
      records_note: interestRecordsNote(range.from_date, recordsStartDate),
      rows,
      total_interest_paid: roundMoney(
        rows.reduce((sum, row) => sum + row.amount_paid, 0),
      ),
    };
  }

  async loadOverdue(query: OverdueReportQueryDto) {
    const rows = await this.repository.loadOverdueRows(
      query.due_on_or_before,
      await this.toLocationFilter(query.location_from, query.location_to),
    );

    // Group the item rows under their ticket, keeping the SQL order.
    const tickets = new Map<number, OverdueReportTicket>();
    for (const row of rows) {
      let ticket = tickets.get(row.ticket_number);
      if (!ticket) {
        ticket = {
          ticket_number: row.ticket_number,
          client_name: row.client_name,
          location: row.location,
          transaction_date: row.transaction_date,
          due_date: row.due_date,
          interest_paid_months: row.interest_paid_months,
          items: [],
        };
        tickets.set(row.ticket_number, ticket);
      }
      if (row.item_number !== null) {
        ticket.items.push({
          description: row.item_description,
          brand_name: row.brand_name,
          model_number: row.model_number,
          serial_number: row.serial_number,
        });
      }
    }

    const list = [...tickets.values()];
    return {
      due_on_or_before: query.due_on_or_before,
      location_from: query.location_from,
      location_to: query.location_to,
      tickets: list,
      total_tickets: list.length,
      total_items: list.reduce((sum, ticket) => sum + ticket.items.length, 0),
    };
  }

  // AB11..AC43 and RR-A..RR-Z are ranges; other codes (AK) are reported alone.
  private async toLocationFilter(
    locationFrom: string,
    locationTo: string,
  ): Promise<OverdueLocationFilter> {
    const existing = await this.repository.loadExistingLocations([
      locationFrom,
      locationTo,
    ]);
    if (!existing.includes(locationFrom)) {
      throw fieldError(
        'location_from',
        'Select a From location from the list.',
      );
    }
    if (!existing.includes(locationTo)) {
      throw fieldError('location_to', 'Select a To location from the list.');
    }

    const from = parseLocation(locationFrom);
    const to = parseLocation(locationTo);
    if (from.kind === 'single' || to.kind === 'single') {
      if (locationFrom !== locationTo) {
        throw fieldError(
          'location_to',
          'This location can only be reported on its own: use the same From and To.',
        );
      }
      return { kind: 'single', location: locationFrom };
    }

    const outOfOrder = () =>
      fieldError(
        'location_to',
        'To location must be the same as or later than From location.',
      );
    if (from.kind === 'shelf' && to.kind === 'shelf') {
      if (isKeyAfter(from.key, to.key)) throw outOfOrder();
      return { kind: 'shelf', from: from.key, to: to.key };
    }
    if (from.kind === 'lettered' && to.kind === 'lettered') {
      if (isKeyAfter(from.key, to.key)) throw outOfOrder();
      return { kind: 'lettered', from: from.key, to: to.key };
    }
    throw fieldError(
      'location_to',
      'From and To must be the same kind of location, such as AA11 to AB20 or RR-A to RR-Z.',
    );
  }

  // YYYY-MM-DD strings compare correctly as text.
  private requireValidRange({ from_date, to_date }: ReportDateRangeQueryDto) {
    if (from_date > to_date) {
      throw fieldError(
        'to_date',
        'To date must be the same as or later than From date.',
      );
    }
    if (to_date >= oneYearAfter(from_date)) {
      throw fieldError('to_date', 'Date range cannot exceed 1 year.');
    }
  }
}
