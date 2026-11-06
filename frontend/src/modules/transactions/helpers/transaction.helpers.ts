import type { Ticket } from "../../../../../shared/models/ticket.model";

export const filterVisibleTickets = (nextTickets: Ticket[]) =>
  nextTickets.filter(
    (ticket) => ticket.status === "pawned" || ticket.status === "sold",
  );

export const sortTickets = (nextTickets: Ticket[]) =>
  [...nextTickets].sort((a, b) => {
    const aTime = a.transaction_datetime.getTime();
    const bTime = b.transaction_datetime.getTime();

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return (a.ticket_number ?? 0) - (b.ticket_number ?? 0);
  });
