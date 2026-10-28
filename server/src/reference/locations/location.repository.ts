import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

export type LocationOption = {
  location: string;
  description: string;
  is_active: boolean;
};

@Injectable()
export class LocationRepository {
  constructor(private readonly pool: Pool) {}

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
}
