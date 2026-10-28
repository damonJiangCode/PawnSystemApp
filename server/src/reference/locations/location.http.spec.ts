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
import { ReferenceModule } from '../reference.module.js';
import type { LocationOption } from './location.repository.js';

describe('Location reference HTTP (mock PostgreSQL)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const pool = { query: vi.fn() };
  let locations: Map<string, LocationOption>;

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
  afterAll(async () => app?.close());
  beforeEach(() => {
    locations = new Map([
      ['AB12', { location: 'AB12', description: 'Shelf A', is_active: true }],
      [
        'CD34',
        { location: 'CD34', description: 'Old shelf', is_active: false },
      ],
      ['UNKNOWN', { location: 'UNKNOWN', description: '', is_active: true }],
    ]);
    pool.query
      .mockReset()
      .mockImplementation(async (sql: string, values: unknown[] = []) => {
        const code = values[0] as string;
        if (sql.startsWith('INSERT')) {
          if (locations.has(code)) return { rows: [] };
          const saved = {
            location: code,
            description: values[1],
            is_active: true,
          } as LocationOption;
          locations.set(code, saved);
          return { rows: [saved] };
        }
        if (sql.startsWith('UPDATE')) {
          const existing = locations.get(values[1] as string);
          if (!existing || existing.is_active !== values[2])
            return { rows: [] };
          const saved = { ...existing, is_active: values[0] as boolean };
          locations.set(saved.location, saved);
          return { rows: [saved] };
        }
        if (sql.includes('WHERE location = $1'))
          return { rows: locations.has(code) ? [locations.get(code)] : [] };
        const rows = [...locations.values()];
        if (sql.includes('WHERE is_active = TRUE'))
          return {
            rows: rows
              .filter((row) => row.is_active)
              .sort((a, b) => a.location.localeCompare(b.location)),
          };
        return {
          rows: rows.sort(
            (a, b) =>
              Number(b.is_active) - Number(a.is_active) ||
              a.location.localeCompare(b.location),
          ),
        };
      });
  });
  const request = (path = '', method = 'GET', body?: unknown) =>
    fetch(`${baseUrl}/reference/locations${path}`, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    });

  it('lists active codes and all reference records in the existing response shapes', async () => {
    let response = await request();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(['AB12', 'UNKNOWN']);
    expect(pool.query.mock.calls[0][0]).toContain(
      'WHERE is_active = TRUE ORDER BY location ASC',
    );
    response = await request('/all');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      locations.get('AB12'),
      locations.get('UNKNOWN'),
      locations.get('CD34'),
    ]);
    expect(pool.query.mock.calls[1][0]).toContain(
      'ORDER BY is_active DESC, location ASC',
    );
  });

  it('adds a normalized location, then deactivates without deleting it', async () => {
    let response = await request('', 'POST', {
      location: ' ef56 ',
      description: '  Drawer 5  ',
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      location: 'EF56',
      description: 'Drawer 5',
      is_active: true,
    });
    expect(pool.query.mock.calls[0][1]).toEqual(['EF56', 'Drawer 5']);
    expect(pool.query.mock.calls[0][0]).toContain(
      'ON CONFLICT (location) DO NOTHING',
    );
    response = await request('/deactivate', 'PATCH', { location: ' ef56 ' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      location: 'EF56',
      description: 'Drawer 5',
      is_active: false,
    });
    expect(pool.query.mock.calls[1][1]).toEqual([false, 'EF56', true]);
    expect(pool.query.mock.calls[1][0]).toContain(
      'WHERE location = $2 AND is_active = $3',
    );
    expect(await (await request()).json()).not.toContain('EF56');
    expect(await (await request('/all')).json()).toContainEqual({
      location: 'EF56',
      description: 'Drawer 5',
      is_active: false,
    });
  });

  it('reactivates a location without losing its description, then rejects repeated activation', async () => {
    const response = await request('/activate', 'PATCH', {
      location: ' cd34 ',
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      location: 'CD34',
      description: 'Old shelf',
      is_active: true,
    });
    expect(pool.query.mock.calls[0][1]).toEqual([true, 'CD34', false]);
    expect(pool.query.mock.calls[0][0]).toContain(
      'WHERE location = $2 AND is_active = $3',
    );
    expect(await (await request()).json()).toContain('CD34');
    expect(
      (await request('/activate', 'PATCH', { location: 'CD34' })).status,
    ).toBe(409);
    expect(
      (await request('/activate', 'PATCH', { location: 'ZZ99' })).status,
    ).toBe(404);
  });

  it('accepts an empty description and stores punctuation as a SQL parameter', async () => {
    let response = await request('', 'POST', {
      location: 'EF56',
      description: '',
    });
    expect(response.status).toBe(201);
    const description = "Owner's shelf; DROP TABLE location; --";
    response = await request('', 'POST', { location: 'GH78', description });
    expect(response.status).toBe(201);
    const [sql, values] = pool.query.mock.calls[1];
    expect(sql).not.toContain(description);
    expect(values).toEqual(['GH78', description]);
  });

  it.each(['AB12', 'CD34'])(
    'returns 409 for duplicate active/inactive code %s',
    async (code) => {
      const response = await request('', 'POST', {
        location: code.toLowerCase(),
        description: '',
      });
      expect(response.status).toBe(409);
      expect(locations.get(code)?.is_active).toBe(code === 'AB12');
    },
  );

  it('distinguishes a missing location from one already inactive', async () => {
    expect(
      (await request('/deactivate', 'PATCH', { location: 'ZZ99' })).status,
    ).toBe(404);
    expect(
      (await request('/deactivate', 'PATCH', { location: 'CD34' })).status,
    ).toBe(409);
  });

  it('allows deactivating legacy special codes without allowing new special codes', async () => {
    expect(
      (await request('/deactivate', 'PATCH', { location: ' unknown ' })).status,
    ).toBe(200);
    expect(locations.get('UNKNOWN')?.is_active).toBe(false);
    expect(
      (await request('/activate', 'PATCH', { location: ' unknown ' })).status,
    ).toBe(200);
    expect(locations.get('UNKNOWN')?.is_active).toBe(true);
    expect(
      (await request('', 'POST', { location: 'UNKNOWN', description: '' }))
        .status,
    ).toBe(400);
  });

  it.each([
    {},
    { location: '' },
    { location: null },
    { location: 12 },
    { location: 'A123', description: '' },
    { location: 'AB1', description: '' },
    { location: 'AB123', description: '' },
    { location: 'AB12' },
    { location: 'AB12', description: null },
    { location: 'AB12', description: 1 },
    { location: 'AB12', description: 'a'.repeat(1001) },
    { location: 'AB12', description: '', is_active: false },
  ])('rejects invalid create input before SQL: %j', async (body) => {
    expect((await request('', 'POST', body)).status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { location: '' },
    { location: 1 },
    { location: null },
    { location: 'a'.repeat(501) },
    { location: 'AB12', is_active: false },
  ])(
    'rejects invalid activation/deactivation input before SQL: %j',
    async (body) => {
      expect((await request('/deactivate', 'PATCH', body)).status).toBe(400);
      expect((await request('/activate', 'PATCH', body)).status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    },
  );

  it('returns 500 for database failures rather than success', async () => {
    pool.query.mockRejectedValue(new Error('Database unavailable'));
    expect((await request()).status).toBe(500);
    expect(
      (await request('/activate', 'PATCH', { location: 'CD34' })).status,
    ).toBe(500);
    expect(
      (await request('', 'POST', { location: 'EF56', description: '' })).status,
    ).toBe(500);
    expect(
      (await request('/deactivate', 'PATCH', { location: 'AB12' })).status,
    ).toBe(500);
  });

  it('does not expose delete or rename operations', async () => {
    for (const [method, path] of [
      ['DELETE', '/AB12'],
      ['PATCH', '/AB12'],
    ]) {
      expect((await request(path, method, { location: 'AB12' })).status).toBe(
        404,
      );
    }
    expect(pool.query).not.toHaveBeenCalled();
  });
});
