import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

export type IdTypeOption = { type: string; is_active: boolean };

export type HolidayOption = { holiday_date: string; name: string };

export type LocationOption = {
  location: string;
  description: string;
  is_active: boolean;
};

export type ColorKind = 'hair' | 'eye';
export type ColorOption = { color: string; is_active: boolean };

@Injectable()
export class ReferenceRepository {
  constructor(private readonly pool: Pool) {}

  async loadCities() {
    const result = await this.pool.query<{ city: string; province: string }>(
      'SELECT DISTINCT city, province FROM city ORDER BY province ASC, city ASC',
    );
    const groups = new Map<string, string[]>();
    for (const { city, province } of result.rows) {
      if (!groups.has(province)) groups.set(province, []);
      groups.get(province)!.push(city);
    }
    return {
      provinces: [...groups.keys()],
      citiesByProvince: Object.fromEntries(groups),
    };
  }

  async loadIdTypes() {
    const result = await this.pool.query<{ type: string }>(
      'SELECT type FROM id_type WHERE is_active = TRUE ORDER BY type ASC',
    );
    return result.rows.map((row) => row.type);
  }

  async loadAllIdTypes() {
    const result = await this.pool.query<IdTypeOption>(
      'SELECT type, is_active FROM id_type ORDER BY is_active DESC, type ASC',
    );
    return result.rows;
  }

  async addIdType(type: string) {
    const result = await this.pool.query<IdTypeOption>(
      'INSERT INTO id_type (type, is_active) VALUES ($1, TRUE) ON CONFLICT DO NOTHING RETURNING type, is_active',
      [type],
    );
    return result.rows[0] ?? null;
  }

  async setIdTypeActive(type: string, isActive: boolean) {
    const result = await this.pool.query<IdTypeOption>(
      `UPDATE id_type SET is_active = $1
       WHERE LOWER(type) = LOWER($2) AND is_active = $3 RETURNING type, is_active`,
      [isActive, type, !isActive],
    );
    return result.rows[0] ?? null;
  }

  async findIdType(type: string) {
    const result = await this.pool.query<IdTypeOption>(
      'SELECT type, is_active FROM id_type WHERE LOWER(type) = LOWER($1)',
      [type],
    );
    return result.rows[0] ?? null;
  }

  async loadColors(kind: 'hair' | 'eye') {
    // Only internal literal choices select a table; request input is never SQL.
    const table = kind === 'hair' ? 'hair_color' : 'eye_color';
    const result = await this.pool.query<{ color: string }>(
      `SELECT UPPER(color) AS color FROM ${table} WHERE is_active = TRUE ORDER BY color ASC`,
    );
    return result.rows.map((row) => row.color);
  }

  async loadAllColors(kind: ColorKind) {
    const table = kind === 'hair' ? 'hair_color' : 'eye_color';
    const result = await this.pool.query<ColorOption>(
      `SELECT UPPER(color) AS color, is_active FROM ${table} ORDER BY is_active DESC, color ASC`,
    );
    return result.rows;
  }

  async addColor(kind: ColorKind, color: string) {
    const table = kind === 'hair' ? 'hair_color' : 'eye_color';
    const result = await this.pool.query<{ color: string }>(
      `INSERT INTO ${table} (color, is_active) VALUES ($1, TRUE) ON CONFLICT (color) DO NOTHING RETURNING color`,
      [color],
    );
    return result.rows[0]?.color ?? null;
  }

  async setColorActive(kind: ColorKind, color: string, isActive: boolean) {
    const table = kind === 'hair' ? 'hair_color' : 'eye_color';
    const result = await this.pool.query<ColorOption>(
      `UPDATE ${table} SET is_active = $1 WHERE UPPER(color) = $2 AND is_active = $3 RETURNING UPPER(color) AS color, is_active`,
      [isActive, color, !isActive],
    );
    return result.rows[0] ?? null;
  }

  async findColor(kind: ColorKind, color: string) {
    const table = kind === 'hair' ? 'hair_color' : 'eye_color';
    const result = await this.pool.query<ColorOption>(
      `SELECT UPPER(color) AS color, is_active FROM ${table} WHERE UPPER(color) = $1`,
      [color],
    );
    return result.rows[0] ?? null;
  }

  async loadLocations() {
    const result = await this.pool.query<{ location: string }>(
      'SELECT location FROM location WHERE is_active = TRUE ORDER BY location ASC',
    );
    return result.rows.map((row) => row.location);
  }

  async loadAllLocations() {
    const result = await this.pool.query<LocationOption>(
      'SELECT location, description, is_active FROM location ORDER BY is_active DESC, location ASC',
    );
    return result.rows;
  }

  async addLocation(location: string, description: string) {
    const result = await this.pool.query<LocationOption>(
      `INSERT INTO location (location, description, is_active)
       VALUES ($1, $2, TRUE) ON CONFLICT (location) DO NOTHING
       RETURNING location, description, is_active`,
      [location, description],
    );
    return result.rows[0] ?? null;
  }

  async setLocationActive(location: string, isActive: boolean) {
    const result = await this.pool.query<LocationOption>(
      `UPDATE location SET is_active = $1
       WHERE location = $2 AND is_active = $3
       RETURNING location, description, is_active`,
      [isActive, location, !isActive],
    );
    return result.rows[0] ?? null;
  }

  async findLocation(location: string) {
    const result = await this.pool.query<LocationOption>(
      'SELECT location, description, is_active FROM location WHERE location = $1',
      [location],
    );
    return result.rows[0] ?? null;
  }

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
