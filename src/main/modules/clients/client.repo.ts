import type { Client } from "../../../shared/models/client.model.ts";
import { connect } from "../../database/connection.ts";
import {
  clientWithIdentificationsFromClause,
  mapRowToClient,
} from "./client.mapper.ts";

type DbClient = Awaited<ReturnType<typeof connect>>;

const getDbClient = async (dbClient?: DbClient) =>
  dbClient ?? (await connect());

export const clientRepo = {
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

  incrementSellCount: async (
    clientNumber: number,
    dbClient?: DbClient,
  ): Promise<void> => {
    const client = await getDbClient(dbClient);

    try {
      await client.query(
        `
          UPDATE client
          SET sell_count = COALESCE(sell_count, 0) + 1,
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

  deleteByNumber: async (
    clientNumber: number,
    dbClient?: DbClient,
  ): Promise<boolean> => {
    const client = await getDbClient(dbClient);

    try {
      const result = await client.query(
        `DELETE FROM client WHERE client_number = $1`,
        [clientNumber],
      );
      return (result.rowCount ?? 0) > 0;
    } finally {
      if (!dbClient) {
        client.release();
      }
    }
  },
};
