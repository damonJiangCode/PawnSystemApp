import type { Ticket } from "../../../../shared/models/ticket.model";

export const canRepawnTicket = (ticket?: Ticket | null) =>
  ticket?.status === "pawned_expired" || ticket?.status === "pawned_picked_up";

const getValidTime = (date?: Date) => {
  const time = date?.getTime();
  return Number.isFinite(time) ? time : undefined;
};

export const getHistoryActivityTime = (ticket: Ticket) =>
  getValidTime(ticket.status_updated_at) ??
  (ticket.status === "pawned_picked_up"
    ? getValidTime(ticket.pickup_datetime)
    : getValidTime(ticket.expire_date)) ??
  ticket.transaction_datetime.getTime();

export const sortHistoryTickets = (tickets: Ticket[]) =>
  [...tickets].sort((a, b) => {
    const activityTimeDifference =
      getHistoryActivityTime(a) - getHistoryActivityTime(b);

    if (activityTimeDifference !== 0) {
      return activityTimeDifference;
    }

    return (a.ticket_number ?? 0) - (b.ticket_number ?? 0);
  });
