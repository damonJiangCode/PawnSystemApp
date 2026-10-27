import { Injectable } from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';
import type {
  CreateClientDetailsDto,
  CreateClientIdDto,
} from './dto/create-client.dto.js';

import { mapRowToClient } from './client.mapper.js';

export type ClientChanges = Partial<CreateClientDetailsDto> & {
  image_path?: string;
  hold_until?: string | null;
  is_active?: boolean;
};

@Injectable()
export class ClientRepository {
  constructor(private readonly pool: Pool) {}

  async loadForUpdate(clientNumber: number, connection: PoolClient) {
    const result = await connection.query(
      'SELECT * FROM client WHERE client_number = $1 FOR UPDATE',
      [clientNumber],
    );
    return result.rows[0] as Record<string, unknown> | undefined;
  }

  async update(
    clientNumber: number,
    changes: ClientChanges,
    connection: PoolClient,
  ) {
    const columns = [
      'first_name',
      'last_name',
      'middle_name',
      'date_of_birth',
      'gender',
      'hair_color',
      'eye_color',
      'height_cm',
      'weight_kg',
      'address',
      'postal_code',
      'city',
      'province',
      'country',
      'email',
      'phone',
      'notes',
      'pickup_self_only',
      'is_active',
      'hold_until',
      'image_path',
    ] as const;
    const uppercase = new Set([
      'first_name',
      'last_name',
      'middle_name',
      'gender',
      'hair_color',
      'eye_color',
    ]);
    const values: unknown[] = [clientNumber];
    const assignments: string[] = [];
    for (const column of columns) {
      let value = changes[column];
      if (value === undefined) continue;
      if (typeof value === 'string') {
        value = value.trim();
        if (uppercase.has(column)) value = value.toUpperCase();
      }
      values.push(value === '' ? null : value);
      assignments.push(`${column} = $${values.length}`);
    }
    if (changes.image_path !== undefined)
      assignments.push('image_updated_at = CURRENT_TIMESTAMP');
    assignments.push('updated_at = CURRENT_TIMESTAMP');
    const result = await connection.query(
      `UPDATE client SET ${assignments.join(', ')} WHERE client_number = $1 RETURNING *`,
      values,
    );
    return result.rows[0] as Record<string, unknown>;
  }

  async loadIdTypeStates(types: string[], connection: PoolClient) {
    const result = await connection.query<{ type: string; is_active: boolean }>(
      'SELECT type, is_active FROM id_type WHERE type = ANY($1::text[]) ORDER BY type FOR SHARE',
      [types],
    );
    return result.rows;
  }

  async loadIds(clientNumber: number, connection: PoolClient) {
    const result = await connection.query(
      'SELECT id, id_type, id_value, updated_at FROM client_id WHERE client_number = $1 ORDER BY id',
      [clientNumber],
    );
    return result.rows;
  }

  async deleteIds(clientNumber: number, connection: PoolClient) {
    await connection.query('DELETE FROM client_id WHERE client_number = $1', [
      clientNumber,
    ]);
  }

  async create(
    details: CreateClientDetailsDto & { image_path: string },
    notes: string,
    connection: PoolClient,
  ) {
    const result = await connection.query(
      `INSERT INTO client (
        first_name, last_name, middle_name, date_of_birth, gender,
        hair_color, eye_color, height_cm, weight_kg, address, postal_code,
        city, province, country, email, phone, notes, image_path,
        image_updated_at, pickup_self_only
      ) VALUES (
        $1,$2,$3,$4::date,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        CURRENT_TIMESTAMP,$19
      ) RETURNING *`,
      [
        details.first_name.trim().toUpperCase(),
        details.last_name.trim().toUpperCase(),
        details.middle_name?.trim().toUpperCase() || null,
        details.date_of_birth,
        details.gender.trim().toUpperCase(),
        details.hair_color.trim().toUpperCase(),
        details.eye_color.trim().toUpperCase(),
        details.height_cm,
        details.weight_kg,
        details.address.trim(),
        details.postal_code?.trim() || null,
        details.city.trim(),
        details.province.trim(),
        details.country.trim(),
        details.email?.trim() || null,
        details.phone?.trim() || null,
        notes || null,
        details.image_path,
        details.pickup_self_only ?? false,
      ],
    );
    return result.rows[0] as Record<string, unknown>;
  }

  async insertIds(
    clientNumber: number,
    ids: CreateClientIdDto[],
    connection: PoolClient,
  ) {
    if (!ids.length) return [];

    const values: (number | string)[] = [clientNumber];
    const placeholders = ids.map((id, index) => {
      values.push(id.id_type.trim(), id.id_value.trim());
      const offset = index * 2 + 2;
      return `($1, $${offset}, $${offset + 1})`;
    });
    const result = await connection.query<{
      id: number;
      id_type: string;
      id_value: string;
      updated_at: Date;
    }>(
      `INSERT INTO client_id (client_number, id_type, id_value)
       VALUES ${placeholders.join(', ')}
       RETURNING id, id_type, id_value, updated_at`,
      values,
    );
    return result.rows;
  }

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

  async searchByDob(dateOfBirth: string) {
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
       WHERE c.date_of_birth = $1::date
       ORDER BY c.last_name, c.first_name, c.client_number`,
      [dateOfBirth],
    );
    return result.rows.map(mapRowToClient);
  }
}
