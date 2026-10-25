import { connect } from "../../../../database/connection.ts";
import type { Location } from "../../../shared/models/location.model.ts";
import type { SaveLocationInput } from "../../../shared/payload-contracts/ticket.contract.ts";

const mapLocationRow = (row: Record<string, unknown>): Location => ({
  location: String(row.location),
  description: String(row.description ?? ""),
  is_active: Boolean(row.is_active),
});

export const ticketLocationRepo = {
  loadLocations: async (): Promise<string[]> => {
    const client = await connect();
    const query = `
      SELECT location
      FROM location
      WHERE is_active = TRUE
      ORDER BY location ASC
    `;

    try {
      const result = await client.query(query);
      return result.rows.map((row) => row.location);
    } finally {
      client.release();
    }
  },

  loadLocationsForAdmin: async (): Promise<Location[]> => {
    const client = await connect();
    const query = `
      SELECT location, description, is_active
      FROM location
      ORDER BY is_active DESC, location ASC
    `;

    try {
      const result = await client.query(query);
      return result.rows.map(mapLocationRow);
    } finally {
      client.release();
    }
  },

  addLocation: async (input: SaveLocationInput): Promise<Location | null> => {
    const client = await connect();
    const query = `
      INSERT INTO location (location, description, is_active)
      VALUES ($1, $2, TRUE)
      ON CONFLICT (location) DO NOTHING
      RETURNING location, description, is_active
    `;

    try {
      const result = await client.query(query, [
        input.location,
        input.description,
      ]);
      const row = result.rows[0];

      return row ? mapLocationRow(row) : null;
    } finally {
      client.release();
    }
  },

  deactivateLocation: async (location: string): Promise<Location | null> => {
    const client = await connect();
    const query = `
      UPDATE location
      SET is_active = FALSE
      WHERE location = $1 AND is_active = TRUE
      RETURNING location, description, is_active
    `;

    try {
      const result = await client.query(query, [location]);
      const row = result.rows[0];

      return row ? mapLocationRow(row) : null;
    } finally {
      client.release();
    }
  },
};
