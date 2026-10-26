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
  TicketFormField,
} from "../../../../../shared/payload-contracts/ticket.contract";
import { extractBackendFieldError } from "../../../shared/utils/formError";

export type { TicketFormField } from "../../../../../shared/payload-contracts/ticket.contract";

export type TicketFormError = Error & {
  field?: TicketFormField;
};

const createFieldError = (
  field: TicketFormField,
  message: string,
): TicketFormError => {
  const error = new Error(message) as TicketFormError;
  error.field = field;
  return error;
};

const trimText = (value?: string) => value?.trim() ?? "";

const toNumber = (value: unknown) => Number(value);

const toNonNegativeNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, numberValue) : fallback;
};

export const normalizeCreatePawnTicketInput = (
  input: CreatePawnTicketInput,
): CreatePawnTicketInput => ({
  ...input,
  description: trimText(input.description),
  location: trimText(input.location),
  amount: toNumber(input.amount),
  onetime_fee: toNonNegativeNumber(input.onetime_fee),
  employee_password: trimText(input.employee_password),
});

export const normalizeCreateSellTicketInput = (
  input: CreateSellTicketInput,
): CreateSellTicketInput => ({
  ...input,
  description: trimText(input.description),
  location: trimText(input.location),
  amount: toNumber(input.amount),
  employee_password: trimText(input.employee_password),
});

export const normalizeUpdateTicketInput = (
  input: UpdateTicketInput,
): UpdateTicketInput => ({
  ticket_number: input.ticket_number,
  is_lost: Boolean(input.is_lost),
  description: trimText(input.description),
  location: trimText(input.location),
  amount: toNumber(input.amount),
  onetime_fee: toNonNegativeNumber(input.onetime_fee),
  partial_payment: toNonNegativeNumber(input.partial_payment),
  employee_password: trimText(input.employee_password),
});

export const normalizeTransferTicketInput = (
  input: TransferTicketInput,
): TransferTicketInput => ({
  ticket_number: toNumber(input.ticket_number),
  client_number: toNumber(input.client_number),
});

export const normalizeConvertTicketInput = (
  input: ConvertTicketInput,
): ConvertTicketInput => ({
  ticket_number: toNumber(input.ticket_number),
  target_status: input.target_status,
  description: trimText(input.description),
  location: trimText(input.location),
  amount: toNumber(input.amount),
  onetime_fee: toNonNegativeNumber(input.onetime_fee),
  employee_password: trimText(input.employee_password),
});

export const normalizeExpireTicketInput = (
  input: ExpireTicketInput,
): ExpireTicketInput => ({
  ticket_number: toNumber(input.ticket_number),
  employee_password:
    input.employee_password === undefined
      ? undefined
      : trimText(input.employee_password),
});

export const normalizeMarkTicketStolenInput = (
  input: MarkTicketStolenInput,
): MarkTicketStolenInput => ({
  ticket_number: toNumber(input.ticket_number),
  employee_password: trimText(input.employee_password),
});

export const normalizePickupTicketsInput = (
  input: PickupTicketsInput,
): PickupTicketsInput => ({
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

export const normalizeExtendTicketsInput = (
  input: ExtendTicketsInput,
): ExtendTicketsInput => ({
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

export const normalizeReverseTicketInput = (
  input: ReverseTicketInput,
): ReverseTicketInput => ({
  ticket_number: toNumber(input.ticket_number),
});

export const mapBackendError = (error: unknown): Error => {
  if (!(error instanceof Error)) {
    return new Error("Unknown ticket error");
  }

  const backendFieldError = extractBackendFieldError(error.message);

  if (!backendFieldError) {
    return error;
  }

  return createFieldError(
    backendFieldError.field as TicketFormField,
    backendFieldError.message,
  );
};
