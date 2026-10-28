import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

export type HolidayOption = { holiday_date: string; name: string };

@Injectable()
export class HolidayRepository {
  constructor(private readonly pool: Pool) {}

  async loadHolidayDates() {
    const result = await this.pool.query<HolidayOption>(
      'SELECT holiday_date::text AS holiday_date, name FROM holiday_date ORDER BY holiday_date ASC',
    );
    return result.rows;
  }

  async addHolidayDate(holidayDate: string, name: string) {
    const result = await this.pool.query<HolidayOption>(
      `INSERT INTO holiday_date (holiday_date, name) VALUES ($1, $2)
       ON CONFLICT (holiday_date) DO NOTHING
       RETURNING holiday_date::text AS holiday_date, name`,
      [holidayDate, name],
    );
    return result.rows[0] ?? null;
  }

  async deleteHolidayDate(holidayDate: string) {
    const result = await this.pool.query<HolidayOption>(
      `DELETE FROM holiday_date WHERE holiday_date = $1
       RETURNING holiday_date::text AS holiday_date, name`,
      [holidayDate],
    );
    return result.rows[0] ?? null;
  }
}
