import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

import { mapRowToClient } from './client.mapper.js';

@Injectable()
export class ClientRepository {
  constructor(private readonly pool: Pool) {}

  async searchByName(firstName: string, lastName: string) {
    const firstPrefix = firstName.replace(/[!%_]/g, '!$&');
    const lastPrefix = lastName.replace(/[!%_]/g, '!$&');
    const result = await this.pool.query(
      `SELECT
    c.*,
    COALESCE(ci.identifications, '[]') AS identifications
  FROM client c
  LEFT JOIN LATERAL (
    SELECT json_agg(
      jsonb_build_object(
        'id', client_id.id,
        'id_type', client_id.id_type,
        'id_value', client_id.id_value,
        'updated_at', client_id.updated_at
      )
      ORDER BY client_id.id
    ) AS identifications
    FROM client_id
    WHERE client_id.client_number = c.client_number
  ) ci ON TRUE
       WHERE ($1 = '' OR c.first_name ILIKE ($1 || '%') ESCAPE '!')
         AND ($2 = '' OR c.last_name ILIKE ($2 || '%') ESCAPE '!')
       ORDER BY c.last_name, c.first_name, c.client_number`,
      [firstPrefix, lastPrefix],
    );

    return result.rows.map(mapRowToClient);
  }
}
