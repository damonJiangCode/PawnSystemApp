import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { ReferenceModule } from './reference.module.js';

describe('Reference HTTP API (mock PostgreSQL)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const pool = { query: vi.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ReferenceModule],
    })
      .overrideProvider(Pool)
      .useValue(pool)
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });
  beforeEach(() => {
    pool.query.mockReset();
  });
  afterAll(async () => app?.close());

  it('returns the existing province/city grouping using one sorted distinct query', async () => {
    pool.query.mockResolvedValue({
      rows: [
        { province: 'AB', city: 'Calgary' },
        { province: 'SK', city: 'Regina' },
        { province: 'SK', city: 'Saskatoon' },
      ],
    });
    const response = await fetch(`${baseUrl}/client/reference/cities`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      provinces: ['AB', 'SK'],
      citiesByProvince: {
        AB: ['Calgary'],
        SK: ['Regina', 'Saskatoon'],
      },
    });
    expect(pool.query).toHaveBeenCalledExactlyOnceWith(
      'SELECT DISTINCT city, province FROM city ORDER BY province ASC, city ASC',
    );
  });

  it('returns ID types as an ordered string list', async () => {
    pool.query.mockResolvedValue({
      rows: [{ type: 'LICENSE' }, { type: 'PASSPORT' }],
    });
    const response = await fetch(`${baseUrl}/client/reference/id-types`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(['LICENSE', 'PASSPORT']);
    expect(pool.query).toHaveBeenCalledExactlyOnceWith(
      'SELECT type FROM id_type ORDER BY type ASC',
    );
  });

  it.each(['hair', 'eye'] as const)(
    'queries only active %s colors and returns strings',
    async (kind) => {
      pool.query.mockResolvedValue({
        rows: [{ color: 'BLACK' }, { color: 'BROWN' }],
      });
      const response = await fetch(
        `${baseUrl}/client/reference/${kind}-colors`,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(['BLACK', 'BROWN']);
      expect(pool.query).toHaveBeenCalledExactlyOnceWith(
        `SELECT UPPER(color) AS color FROM ${kind}_color WHERE is_active = TRUE ORDER BY color ASC`,
      );
    },
  );

  it.each(['cities', 'id-types', 'hair-colors', 'eye-colors'])(
    'handles empty %s without inventing seed data',
    async (resource) => {
      pool.query.mockResolvedValue({ rows: [] });
      const response = await fetch(`${baseUrl}/client/reference/${resource}`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        resource === 'cities' ? { provinces: [], citiesByProvince: {} } : [],
      );
      expect(
        pool.query.mock.calls.every(([sql]) => sql.startsWith('SELECT ')),
      ).toBe(true);
    },
  );

  it('reports a database failure as HTTP 500, not a successful empty list', async () => {
    pool.query.mockRejectedValue(new Error('Private database error'));
    const response = await fetch(`${baseUrl}/client/reference/id-types`);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain(
      'Private database error',
    );
  });

  it('does not expose a color delete endpoint', async () => {
    const response = await fetch(`${baseUrl}/client/reference/hair-colors`, {
      method: 'DELETE',
    });
    expect(response.status).toBe(404);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
