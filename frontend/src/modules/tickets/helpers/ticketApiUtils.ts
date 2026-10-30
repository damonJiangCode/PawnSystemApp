import type { TicketFormField } from "../../../../../shared/payload-contracts/ticket.contract";

export type { TicketFormField } from "../../../../../shared/payload-contracts/ticket.contract";

// Errors from the /tickets API carry the server's `field` and HTTP `status`.
export type TicketFormError = Error & {
  field?: TicketFormField;
  status?: number;
};
