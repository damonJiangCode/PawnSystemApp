import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

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
      'SELECT type FROM id_type ORDER BY type ASC',
    );
    return result.rows.map((row) => row.type);
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
}
