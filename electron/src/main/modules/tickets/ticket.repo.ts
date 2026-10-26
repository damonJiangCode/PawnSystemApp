import { connect } from "../../../../../database/connection.ts";
import type { TransferTicketPreview } from "../../../../../shared/payload-contracts/ticket.contract.ts";
import type { Ticket } from "../../../../../shared/models/ticket.model.ts";
import {
  clientDisplayNameSql,
  mapTicketRow,
  mapTransferTicketPreviewRow,
  ticketSelectColumns,
} from "./ticket.mapper.ts";
import type {
  AddTicketPayload,
  ConvertTicketPayload,
  DbClient,
  ExpireTicketPayload,
  ExtendTicketPayload,
  MarkTicketStolenPayload,
  PickupTicketsPayload,
  UpdateTicketPayload,
} from "./ticket.types.ts";
import { interestPaymentRepo } from "./interest-payment.repo.ts";

const attachInterestPaymentSummaries = async (
  tickets: Ticket[],
  client: DbClient,
) => {
  const ticketNumbers = tickets.flatMap((ticket) =>
    ticket.ticket_number ? [ticket.ticket_number] : [],
  );
  const summaries = await interestPaymentRepo.loadSummaries(
    ticketNumbers,
    client,
  );

  return tickets.map((ticket) => {
    const summary = summaries.get(Number(ticket.ticket_number));
    return {
      ...ticket,
      recorded_interest_amount_paid: summary?.amountPaid ?? 0,
      recorded_interest_months_paid: summary?.monthsPaid ?? 0,
    };
  });
};

export const ticketRepo = {
  loadByClientNumber: async (clientNumber: number): Promise<Ticket[]> => {
    const client = await connect();
    const query = `
      SELECT ${ticketSelectColumns}
      FROM ticket
      WHERE client_number = $1
      ORDER BY transaction_datetime ASC, ticket_number ASC
    `;

    try {
      const result = await client.query(query, [clientNumber]);
      return attachInterestPaymentSummaries(
        result.rows.map(mapTicketRow),
        client,
      );
    } finally {
      client.release();
    }
  },

  loadByTicketNumber: async (
    ticketNumber: number,
    dbClient?: DbClient,
  ): Promise<Ticket | null> => {
    const client = dbClient ?? (await connect());
    const query = `
      SELECT ${ticketSelectColumns}
      FROM ticket
      WHERE ticket_number = $1
      LIMIT 1
    `;

    try {
      const result = await client.query(query, [ticketNumber]);
      if (!result.rows[0]) {
        return null;
      }
      return (
        await attachInterestPaymentSummaries(
          [mapTicketRow(result.rows[0])],
          client,
        )
      )[0];
    } finally {
      if (!dbClient) {
        client.release();
      }
    }
  },

  loadByTicketNumberForUpdate: async (
    ticketNumber: number,
    client: DbClient,
  ): Promise<Ticket | null> => {
    const query = `
      SELECT ${ticketSelectColumns}
      FROM ticket
      WHERE ticket_number = $1
      LIMIT 1
      FOR UPDATE
    `;
    const result = await client.query(query, [ticketNumber]);
    return result.rows[0] ? mapTicketRow(result.rows[0]) : null;
  },

  loadTransferTicketPreview: async (
    ticketNumber: number,
  ): Promise<TransferTicketPreview | null> => {
    const client = await connect();
    const query = `
      SELECT
        t.ticket_number,
        t.status,
        t.description,
        t.location,
        t.amount,
        t.client_number AS previous_client_number,
        ${clientDisplayNameSql("c")} AS previous_client_name
      FROM ticket t
      INNER JOIN client c ON c.client_number = t.client_number
      WHERE t.ticket_number = $1
      LIMIT 1
    `;

    try {
      const result = await client.query(query, [ticketNumber]);
      return result.rows[0]
        ? mapTransferTicketPreviewRow(result.rows[0])
        : null;
    } finally {
      client.release();
    }
  },

  create: async (
    payload: AddTicketPayload,
    dbClient?: DbClient,
  ): Promise<Ticket> => {
    const client = dbClient ?? (await connect());
    const query = `
      INSERT INTO ticket (
        transaction_datetime,
        is_lost,
        location,
        description,
        due_date,
        amount,
        onetime_fee,
        employee_name,
        status,
        client_number
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
      )
      RETURNING ${ticketSelectColumns}
    `;

    const values = [
      payload.transaction_datetime,
      payload.is_lost,
      payload.location,
      payload.description,
      payload.due_date,
      payload.amount,
      payload.onetime_fee,
      payload.employee_name,
      payload.status,
      payload.client_number,
    ];

    try {
      const result = await client.query(query, values);
      return mapTicketRow(result.rows[0]);
    } finally {
      if (!dbClient) {
        client.release();
      }
    }
  },

  update: async (
    payload: UpdateTicketPayload,
    dbClient?: DbClient,
  ): Promise<Ticket> => {
    const client = dbClient ?? (await connect());
    const query = `
      UPDATE ticket
      SET
        is_lost = $1,
        location = $2,
        description = $3,
        amount = $4,
        onetime_fee = $5,
        partial_payment = $6,
        partial_payment_datetime = CASE
          WHEN $6 IS DISTINCT FROM partial_payment THEN CURRENT_TIMESTAMP
          ELSE partial_payment_datetime
        END,
        employee_name = $7
      WHERE ticket_number = $8
      RETURNING ${ticketSelectColumns}
    `;

    const values = [
      payload.is_lost,
      payload.location,
      payload.description,
      payload.amount,
      payload.onetime_fee,
      payload.partial_payment,
      payload.employee_name,
      payload.ticket_number,
    ];

    try {
      const result = await client.query(query, values);

      if (!result.rows[0]) {
        throw new Error(
          `[ticketRepo] updateTicket(): Ticket #${payload.ticket_number} not found`,
        );
      }

      return mapTicketRow(result.rows[0]);
    } finally {
      if (!dbClient) {
        client.release();
      }
    }
  },

  convert: async (
    payload: ConvertTicketPayload,
    dbClient?: DbClient,
  ): Promise<Ticket> => {
    const client = dbClient ?? (await connect());
    const query = `
      UPDATE ticket
      SET
        status = $1,
        description = $2,
        location = $3,
        amount = $4,
        due_date = $5,
        onetime_fee = $6,
        employee_name = $7,
        status_updated_at = CURRENT_TIMESTAMP
      WHERE ticket_number = $8
      RETURNING ${ticketSelectColumns}
    `;

    const values = [
      payload.status,
      payload.description,
      payload.location,
      payload.amount,
      payload.due_date,
      payload.onetime_fee,
      payload.employee_name,
      payload.ticket_number,
    ];

    try {
      const result = await client.query(query, values);

      if (!result.rows[0]) {
        throw new Error(
          `[ticketRepo] convert(): Ticket #${payload.ticket_number} not found`,
        );
      }

      return mapTicketRow(result.rows[0]);
    } finally {
      if (!dbClient) {
        client.release();
      }
    }
  },

  expire: async (
    payload: ExpireTicketPayload,
    dbClient?: DbClient,
  ): Promise<Ticket> => {
    const client = dbClient ?? (await connect());
    const query = `
      UPDATE ticket
      SET
        status = $1,
        expire_date = CURRENT_TIMESTAMP,
        status_updated_at = CURRENT_TIMESTAMP
      WHERE ticket_number = $2
        AND status = $3
        AND due_date = $4
      RETURNING ${ticketSelectColumns}
    `;

    try {
      const result = await client.query(query, [
        payload.status,
        payload.ticket_number,
        payload.current_status,
        payload.current_due_date,
      ]);

      if (!result.rows[0]) {
        throw new Error(
          `[ticketRepo] expire(): Ticket #${payload.ticket_number} was changed before it could be expired`,
        );
      }

      return mapTicketRow(result.rows[0]);
    } finally {
      if (!dbClient) {
        client.release();
      }
    }
  },

  pickup: async (
    payload: PickupTicketsPayload,
    dbClient?: DbClient,
  ): Promise<Ticket[]> => {
    const client = dbClient ?? (await connect());
    const query = `
      WITH picked AS (
        UPDATE ticket
        SET
          status = 'pawned_picked_up',
          pickup_datetime = $1,
          pickup_amount_paid = pickup_values.input_pickup_amount_paid,
          status_updated_at = $1
        FROM (
          SELECT *
          FROM UNNEST($2::int[], $3::numeric[]) AS pickup_input(input_ticket_number, input_pickup_amount_paid)
        ) AS pickup_values
        WHERE ticket.ticket_number = pickup_values.input_ticket_number
          AND status = 'pawned'
        RETURNING ${ticketSelectColumns}
      ),
      client_counts AS (
        SELECT client_number, COUNT(*)::int AS picked_count
        FROM picked
        GROUP BY client_number
      ),
      updated_clients AS (
        UPDATE client c
        SET
          redeem_count = COALESCE(c.redeem_count, 0) + cc.picked_count,
          updated_at = CURRENT_TIMESTAMP
        FROM client_counts cc
        WHERE c.client_number = cc.client_number
        RETURNING c.client_number
      )
      SELECT ${ticketSelectColumns}
      FROM picked
      ORDER BY ticket_number ASC
    `;

    try {
      const result = await client.query(query, [
        payload.pickup_datetime,
        payload.tickets.map((ticket) => ticket.ticket_number),
        payload.tickets.map((ticket) => ticket.pickup_amount_paid),
      ]);
      return result.rows.map(mapTicketRow);
    } finally {
      if (!dbClient) {
        client.release();
      }
    }
  },

  extend: async (
    payload: ExtendTicketPayload,
    dbClient?: DbClient,
  ): Promise<Ticket> => {
    const client = dbClient ?? (await connect());
    const query = `
      UPDATE ticket
      SET
        due_date = due_date + ($1 * INTERVAL '30 days'),
        interest_paid_months = interest_paid_months + $1,
        interested_datetime = $2
      WHERE ticket_number = $3
        AND status = 'pawned'
      RETURNING ${ticketSelectColumns}
    `;

    try {
      const result = await client.query(query, [
        payload.months,
        payload.interested_datetime,
        payload.ticket_number,
      ]);

      if (!result.rows[0]) {
        throw new Error(
          `[ticketRepo] extend(): Ticket #${payload.ticket_number} not found`,
        );
      }

      return mapTicketRow(result.rows[0]);
    } finally {
      if (!dbClient) {
        client.release();
      }
    }
  },

  markStolen: async (
    payload: MarkTicketStolenPayload,
    dbClient?: DbClient,
  ): Promise<Ticket> => {
    const client = dbClient ?? (await connect());
    const query = `
      UPDATE ticket
      SET is_stolen = TRUE
      WHERE ticket_number = $1
      RETURNING ${ticketSelectColumns}
    `;

    try {
      const result = await client.query(query, [payload.ticket_number]);

      if (!result.rows[0]) {
        throw new Error(
          `[ticketRepo] markStolen(): Ticket #${payload.ticket_number} not found`,
        );
      }

      return mapTicketRow(result.rows[0]);
    } finally {
      if (!dbClient) {
        client.release();
      }
    }
  },

  transfer: async (
    ticketNumber: number,
    clientNumber: number,
    dbClient?: DbClient,
  ): Promise<Ticket> => {
    const client = dbClient ?? (await connect());
    const query = `
      UPDATE ticket
      SET client_number = $1
      WHERE ticket_number = $2
      RETURNING ${ticketSelectColumns}
    `;

    try {
      const result = await client.query(query, [clientNumber, ticketNumber]);

      if (!result.rows[0]) {
        throw new Error(
          `[ticketRepo] transfer(): Ticket #${ticketNumber} not found`,
        );
      }

      return mapTicketRow(result.rows[0]);
    } finally {
      if (!dbClient) {
        client.release();
      }
    }
  },
};
