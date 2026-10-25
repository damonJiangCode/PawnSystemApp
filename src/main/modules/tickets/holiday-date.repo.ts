import { connect } from "../../../../database/connection.ts";
import type { HolidayDate } from "../../../shared/models/holiday-date.model.ts";
import type { SaveHolidayInput } from "../../../shared/payload-contracts/ticket.contract.ts";

const mapHolidayDateRow = (row: Record<string, unknown>): HolidayDate => ({
  holiday_date: String(row.holiday_date),
  name: String(row.name),
});

export const holidayDateRepo = {
  loadHolidayDates: async (): Promise<HolidayDate[]> => {
    const client = await connect();
    const query = `
      SELECT
        holiday_date::text AS holiday_date,
        name
      FROM holiday_date
      ORDER BY holiday_date ASC
    `;

    try {
      const result = await client.query(query);
      return result.rows.map(mapHolidayDateRow);
    } finally {
      client.release();
    }
  },

  addHolidayDate: async (
    input: SaveHolidayInput,
  ): Promise<HolidayDate | null> => {
    const client = await connect();
    const query = `
      INSERT INTO holiday_date (holiday_date, name)
      VALUES ($1, $2)
      ON CONFLICT (holiday_date) DO NOTHING
      RETURNING holiday_date::text AS holiday_date, name
    `;

    try {
      const result = await client.query(query, [
        input.holiday_date,
        input.name,
      ]);
      const row = result.rows[0];

      return row ? mapHolidayDateRow(row) : null;
    } finally {
      client.release();
    }
  },

  deleteHolidayDate: async (
    holidayDate: string,
  ): Promise<HolidayDate | null> => {
    const client = await connect();
    const query = `
      DELETE FROM holiday_date
      WHERE holiday_date = $1
      RETURNING holiday_date::text AS holiday_date, name
    `;

    try {
      const result = await client.query(query, [holidayDate]);
      const row = result.rows[0];

      return row ? mapHolidayDateRow(row) : null;
    } finally {
      client.release();
    }
  },
};
