import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class CityRepository {
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
}
