import { BadRequestException, Injectable } from '@nestjs/common';
import type { ReportDateRangeQueryDto } from './report.dto.js';
import { ReportRepository } from './report.repository.js';

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
