import type {
  ConvertTicketInput,
  ExtendTicketsInput,
  ExpireTicketInput,
  MarkTicketStolenInput,
  PickupTicketsInput,
  CreatePawnTicketInput,
  CreateSellTicketInput,
  ReverseTicketInput,
  TransferTicketInput,
  UpdateTicketInput,
} from "../../../../../shared/payload-contracts/ticket.contract.ts";

const trimText = (value?: string) => value?.trim() ?? "";

const toNumber = (value: unknown) => Number(value);

const toNonNegativeNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, numberValue) : fallback;
};

const normalizeCreatePawnTicket = (input: CreatePawnTicketInput) => ({
  description: trimText(input.description),
  location: trimText(input.location),
  amount: toNumber(input.amount),
  onetime_fee: toNonNegativeNumber(input.onetime_fee),
  employee_password: trimText(input.employee_password),
  client_number: input.client_number,
});

const normalizeCreateSellTicket = (input: CreateSellTicketInput) => ({
  description: trimText(input.description),
  location: trimText(input.location),
  amount: toNumber(input.amount),
  employee_password: trimText(input.employee_password),
  client_number: input.client_number,
});

const normalizeUpdateTicket = (input: UpdateTicketInput) => ({
  ticket_number: input.ticket_number,
  is_lost: Boolean(input.is_lost),
  description: trimText(input.description),
  location: trimText(input.location),
  amount: toNumber(input.amount),
  onetime_fee: toNonNegativeNumber(input.onetime_fee),
  partial_payment: toNonNegativeNumber(input.partial_payment),
  employee_password: trimText(input.employee_password),
});

const normalizeTransferTicket = (input: TransferTicketInput) => ({
  ticket_number: toNumber(input.ticket_number),
  client_number: toNumber(input.client_number),
});

const normalizeConvertTicket = (input: ConvertTicketInput) => ({
  ticket_number: toNumber(input.ticket_number),
  target_status: input.target_status,
  description: trimText(input.description),
  location: trimText(input.location),
  amount: toNumber(input.amount),
  onetime_fee: toNonNegativeNumber(input.onetime_fee),
  employee_password: trimText(input.employee_password),
});

const normalizeExpireTicket = (input: ExpireTicketInput) => ({
  ticket_number: toNumber(input.ticket_number),
  employee_password:
    input.employee_password === undefined
      ? undefined
      : trimText(input.employee_password),
});

const normalizeMarkTicketStolen = (input: MarkTicketStolenInput) => ({
  ticket_number: toNumber(input.ticket_number),
  employee_password: trimText(input.employee_password),
});

const normalizePickupTickets = (input: PickupTicketsInput) => ({
  tickets: [
    ...new Map(
      input.tickets
        .map((ticket) => ({
          ticket_number: toNumber(ticket.ticket_number),
          pickup_amount_paid: toNonNegativeNumber(ticket.pickup_amount_paid),
        }))
        .filter(
          (ticket) =>
            Number.isFinite(ticket.ticket_number) &&
            ticket.ticket_number > 0 &&
            Number.isFinite(ticket.pickup_amount_paid),
        )
        .map((ticket) => [ticket.ticket_number, ticket]),
    ).values(),
  ],
});

const normalizeExtendTickets = (input: ExtendTicketsInput) => ({
  extensions: input.extensions
    .map((extension) => ({
      ticket_number: toNumber(extension.ticket_number),
      months: Math.floor(toNumber(extension.months)),
    }))
    .filter(
      (extension) =>
        Number.isFinite(extension.ticket_number) &&
        extension.ticket_number > 0 &&
        Number.isFinite(extension.months) &&
        extension.months > 0,
    ),
});

const normalizeReverseTicket = (input: ReverseTicketInput) => ({
  ticket_number: toNumber(input.ticket_number),
});

const isValidDateKey = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export const ticketInput = {
  normalizeCreatePawnTicket,
  normalizeCreateSellTicket,
  normalizeUpdateTicket,
  normalizeTransferTicket,
  normalizeConvertTicket,
  normalizeExpireTicket,
  normalizeMarkTicketStolen,
  normalizePickupTickets,
  normalizeExtendTickets,
  normalizeReverseTicket,
  isValidDateKey,
};
