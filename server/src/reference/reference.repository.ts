import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

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
}
