import type { Ticket } from "../../../../../shared/models/ticket.model.ts";
import type { DbClient } from "./ticket.types.ts";
import { mapTicketRow, ticketSelectColumns } from "./ticket.mapper.ts";

export type ReversibleTicketStatus = "pawned_expired" | "pawned_picked_up";

export const ticketReversalRepo = {
  loadTicketForUpdate: async (
    ticketNumber: number,
    client: DbClient,
  ): Promise<Ticket | null> => {
    const result = await client.query(
      `
        SELECT ${ticketSelectColumns}
        FROM ticket
        WHERE ticket_number = $1
        FOR UPDATE
      `,
      [ticketNumber],
    );

    return result.rows[0] ? mapTicketRow(result.rows[0]) : null;
  },

  findConflictingLinkedTicket: async (
    ticketNumber: number,
    client: DbClient,
  ): Promise<{ itemNumber: number; ticketNumber: number } | null> => {
    const result = await client.query(
      `
        SELECT
          current_items.item_number,
          later_ticket.ticket_number
        FROM ticket_item current_items
        INNER JOIN ticket current_ticket
          ON current_ticket.ticket_number = current_items.ticket_number
        INNER JOIN ticket_item later_items
          ON later_items.item_number = current_items.item_number
         AND later_items.ticket_number <> current_items.ticket_number
        INNER JOIN ticket later_ticket
          ON later_ticket.ticket_number = later_items.ticket_number
        WHERE current_items.ticket_number = $1
          AND (
            later_ticket.status IN ('pawned', 'sold')
            OR later_ticket.transaction_datetime > current_ticket.transaction_datetime
            OR (
              later_ticket.transaction_datetime = current_ticket.transaction_datetime
              AND later_ticket.ticket_number > current_ticket.ticket_number
            )
          )
        ORDER BY later_ticket.transaction_datetime DESC,
                 later_ticket.ticket_number DESC
        LIMIT 1
      `,
      [ticketNumber],
    );

    if (!result.rows[0]) {
      return null;
    }

    return {
      itemNumber: Number(result.rows[0].item_number),
      ticketNumber: Number(result.rows[0].ticket_number),
    };
  },

  reverse: async (ticket: Ticket, client: DbClient): Promise<Ticket> => {
    const previousStatus = ticket.status as ReversibleTicketStatus;

    await client.query(
      `
        INSERT INTO ticket_reversal (
          ticket_number,
          previous_status,
          previous_pickup_datetime,
          previous_pickup_amount_paid,
          previous_expire_date
        ) VALUES ($1, $2, $3, $4, $5)
      `,
      [
        ticket.ticket_number,
        previousStatus,
        ticket.pickup_datetime ?? null,
        ticket.pickup_amount_paid ?? null,
        ticket.expire_date ?? null,
      ],
    );

    const result = await client.query(
      `
        UPDATE ticket
        SET
          status = 'pawned',
          pickup_datetime = NULL,
          pickup_amount_paid = NULL,
          expire_date = NULL,
          status_updated_at = CURRENT_TIMESTAMP
        WHERE ticket_number = $1
          AND status = $2
        RETURNING ${ticketSelectColumns}
      `,
      [ticket.ticket_number, previousStatus],
    );

    if (!result.rows[0]) {
      throw new Error(
        `[ticketReversalRepo] Ticket #${ticket.ticket_number} changed before reversal.`,
      );
    }

    const countColumn =
      previousStatus === "pawned_picked_up" ? "redeem_count" : "expire_count";

    await client.query(
      `
        UPDATE client
        SET
          ${countColumn} = GREATEST(COALESCE(${countColumn}, 0) - 1, 0),
          updated_at = CURRENT_TIMESTAMP
        WHERE client_number = $1
      `,
      [ticket.client_number],
    );

    return mapTicketRow(result.rows[0]);
  },
};
