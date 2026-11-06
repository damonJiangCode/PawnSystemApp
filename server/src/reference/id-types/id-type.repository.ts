import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

export type IdTypeOption = { type: string; is_active: boolean };

@Injectable()
export class IdTypeRepository {
  constructor(private readonly pool: Pool) {}

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
}
