import type { Client } from "../../../shared/models/client.model.ts";
import { connect } from "../../database/connection.ts";
import {
  clientWithIdentificationsFromClause,
  mapRowToClient,
} from "./client.mapper.ts";

type DbClient = Awaited<ReturnType<typeof connect>>;

const toDbNullable = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }

  return value ?? null;
};

const getDbClient = async (dbClient?: DbClient) =>
  dbClient ?? (await connect());

export const clientRepo = {
  setHoldUntil: async (
    clientNumber: number,
    holdUntil: string | null,
    dbClient: DbClient,
  ): Promise<Client> => {
    const updated = await dbClient.query(
      "UPDATE client SET hold_until=$2::date, updated_at=CURRENT_TIMESTAMP WHERE client_number=$1 RETURNING client_number",
      [clientNumber, holdUntil],
    );
    if (!updated.rowCount)
      throw new Error("The selected client was not found.");
    const client = await clientRepo.loadByNumber(clientNumber, dbClient);
    if (!client) throw new Error("The selected client was not found.");
    return client;
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

  update: async (
    clientData: Client,
    dbClient?: DbClient,
  ): Promise<{ updated_at: Date }> => {
    const clientNumber = clientData.client_number;

    if (!clientNumber) {
      throw new Error("Missing client_number for update");
    }

    const client = await getDbClient(dbClient);

    const query = `
      UPDATE client
      SET
        first_name = $1,
        last_name = $2,
        middle_name = $3,
        date_of_birth = $4,
        gender = $5,
        hair_color = $6,
        eye_color = $7,
        height_cm = $8,
        weight_kg = $9,
        address = $10,
        postal_code = $11,
        city = $12,
        province = $13,
        country = $14,
        email = $15,
        phone = $16,
        notes = $17,
        image_path = $18,
        image_updated_at = $19,
        pickup_self_only = $20,
        redeem_count = $21,
        sell_count = $22,
        expire_count = $23,
        overdue_count = $24,
        updated_at = CURRENT_TIMESTAMP
      WHERE client_number = $25
      RETURNING updated_at
    `;

    const values = [
      toDbNullable(clientData.first_name),
      toDbNullable(clientData.last_name),
      toDbNullable(clientData.middle_name),
      toDbNullable(clientData.date_of_birth),
      toDbNullable(clientData.gender),
      toDbNullable(clientData.hair_color),
      toDbNullable(clientData.eye_color),
      clientData.height_cm ?? null,
      clientData.weight_kg ?? null,
      toDbNullable(clientData.address),
      toDbNullable(clientData.postal_code),
      toDbNullable(clientData.city),
      toDbNullable(clientData.province),
      toDbNullable(clientData.country),
      toDbNullable(clientData.email),
      toDbNullable(clientData.phone),
      toDbNullable(clientData.notes),
      toDbNullable(clientData.image_path),
      clientData.image_updated_at ?? null,
      Boolean(clientData.pickup_self_only),
      clientData.redeem_count ?? 0,
      clientData.sell_count ?? 0,
      clientData.expire_count ?? 0,
      clientData.overdue_count ?? 0,
      clientNumber,
    ];

    try {
      const result = await client.query(query, values);

      if (result.rowCount === 0) {
        throw new Error(`Client not found: ${clientNumber}`);
      }

      return {
        updated_at: result.rows[0].updated_at as Date,
      };
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
