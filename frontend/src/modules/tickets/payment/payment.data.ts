import { ticketApi } from "../ticket.api";
import type {
  PaymentMode,
  PaymentRowsByMode,
  PaymentTicketRow,
} from "./payment.types";
import { getOppositeMode, mapTicketToPaymentRow } from "./payment.helpers";

type LoadPaymentRowsInput = {
  clientNumber: number;
  mode: PaymentMode;
  selectedRowsByMode: PaymentRowsByMode;
};

export const loadAvailablePaymentRows = async ({
  clientNumber,
  mode,
  selectedRowsByMode,
}: LoadPaymentRowsInput) => {
  const [tickets, holidays] = await Promise.all([
    ticketApi.loadTickets(clientNumber),
    ticketApi.loadHolidayDates(),
  ]);
  const holidayDateKeys = holidays.map((holiday) => holiday.holiday_date);
  const oppositeSelectedTicketNumbers = new Set(
    selectedRowsByMode[getOppositeMode(mode)].map((row) => row.ticketNumber),
  );
  const currentSelectedTicketNumbers = new Set(
    mode === "pickup"
      ? selectedRowsByMode.pickup.map((row) => row.ticketNumber)
      : [],
  );
  const rows = tickets
    .filter((ticket) => ticket.status === "pawned" && !ticket.is_stolen)
    .map((ticket) => mapTicketToPaymentRow(ticket, holidayDateKeys))
    .filter((row): row is PaymentTicketRow => Boolean(row))
    .filter(
      (row) =>
        !currentSelectedTicketNumbers.has(row.ticketNumber) &&
        !oppositeSelectedTicketNumbers.has(row.ticketNumber),
    );

  return { holidayDateKeys, rows };
};

type ProcessPaymentRowsInput = {
  pickupRows: PaymentTicketRow[];
  extensionRows: PaymentTicketRow[];
  holidayDateKeys: string[];
};

export const processPaymentRows = async ({
  pickupRows,
  extensionRows,
  holidayDateKeys,
}: ProcessPaymentRowsInput) => {
  const extensionMonthCounts = extensionRows.reduce<Map<number, number>>(
    (counts, row) => {
      counts.set(
        row.ticketNumber,
        (counts.get(row.ticketNumber) ?? 0) + row.extensionMonths,
      );
      return counts;
    },
    new Map<number, number>(),
  );
  const [pickedUpTickets, extendedTickets] = await Promise.all([
    pickupRows.length
      ? ticketApi.pickupTickets({
          tickets: pickupRows.map((row) => ({
            ticket_number: row.ticketNumber,
            pickup_amount_paid: Number(row.pickupAmount ?? 0),
          })),
        })
      : Promise.resolve([]),
    extensionMonthCounts.size
      ? ticketApi.extendTickets({
          extensions: [...extensionMonthCounts.entries()].map(
            ([ticketNumber, months]) => ({
              ticket_number: ticketNumber,
              months,
            }),
          ),
        })
      : Promise.resolve([]),
  ]);
  const pickedUpIds = new Set(
    pickedUpTickets
      .map((ticket) => ticket.ticket_number)
      .filter((ticketNumber): ticketNumber is number =>
        Number.isFinite(ticketNumber),
      ),
  );
  const pickedUpCountByClient = pickedUpTickets.reduce<Map<number, number>>(
    (counts, ticket) => {
      counts.set(
        ticket.client_number,
        (counts.get(ticket.client_number) ?? 0) + 1,
      );
      return counts;
    },
    new Map<number, number>(),
  );
  const extendedRowByTicketNumber = new Map(
    extendedTickets
      .map((ticket) => mapTicketToPaymentRow(ticket, holidayDateKeys))
      .filter((row): row is PaymentTicketRow => Boolean(row))
      .map((row) => [row.ticketNumber, row]),
  );

  return {
    pickedUpIds,
    pickedUpCounts: [...pickedUpCountByClient.entries()].map(
      ([clientNumber, count]) => ({ clientNumber, count }),
    ),
    replaceExtendedRow: (row: PaymentTicketRow) =>
      extendedRowByTicketNumber.get(row.ticketNumber) ?? row,
  };
};
