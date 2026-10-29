import type { Client } from "../../../../../shared/models/client.model.ts";
import { connect } from "../../../../../database/connection.ts";
import {
  clientWithIdentificationsFromClause,
  mapRowToClient,
} from "./client.mapper.ts";

type DbClient = Awaited<ReturnType<typeof connect>>;

const getDbClient = async (dbClient?: DbClient) =>
  dbClient ?? (await connect());

export const clientRepo = {
  // Every ticket-issuing operation holds these locks until its transaction ends.
  // Sorting avoids reverse-order client locks when transferring between accounts.
  assertActiveForTicket: async (
    clientNumbers: number[],
    dbClient: DbClient,
  ): Promise<void> => {
    const numbers = [...new Set(clientNumbers)].sort((a, b) => a - b);
    if (
      !numbers.length ||
      numbers.some((number) => !Number.isSafeInteger(number) || number <= 0)
    ) {
      throw new Error("Select a valid client before issuing a ticket.");
    }
    const result = await dbClient.query<{
      client_number: number;
      is_active: boolean;
    }>(
      "SELECT client_number, is_active FROM client WHERE client_number = ANY($1::int[]) ORDER BY client_number FOR UPDATE",
      [numbers],
    );
    if (result.rows.length !== numbers.length)
      throw new Error("Client not found.");
    if (result.rows.some((row) => row.is_active !== true)) {
      throw new Error(
        "Deactivated clients cannot issue, convert or transfer tickets. Reactivate the client first.",
      );
    }
  },
  loadByNumber: async (
    clientNumber: number,
    dbClient?: DbClient,
  ): Promise<Client | null> => {
    const client = await getDbClient(dbClient);
    const query = `
      ${clientWithIdentificationsFromClause}
      WHERE c.client_number = $1
      LIMIT 1
    `;

    try {
      const result = await client.query(query, [clientNumber]);
      return result.rows[0] ? mapRowToClient(result.rows[0]) : null;
    } finally {
      if (!dbClient) {
        client.release();
      }
    }
  },

  incrementExpireCount: async (
    clientNumber: number,
    dbClient?: DbClient,
  ): Promise<void> => {
    const client = await getDbClient(dbClient);

    try {
      await client.query(
        `
          UPDATE client
          SET expire_count = COALESCE(expire_count, 0) + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE client_number = $1
        `,
        [clientNumber],
      );
    } finally {
      if (!dbClient) {
        client.release();
      }
    }
  },
};
