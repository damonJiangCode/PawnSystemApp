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

describe('ID type Reference HTTP (mock PostgreSQL)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const pool = { query: vi.fn() };
  let types: Map<string, { type: string; is_active: boolean }>;
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
    types = new Map([
      ['license', { type: 'License', is_active: true }],
      [
        'legacy lib: library',
        { type: 'Legacy LIB: LIBRARY', is_active: false },
      ],
    ]);
    pool.query
      .mockReset()
      .mockImplementation(async (sql: string, values: unknown[] = []) => {
        if (sql.startsWith('INSERT')) {
          const type = values[0] as string;
          if (types.has(type.toLowerCase())) return { rows: [] };
          const row = { type, is_active: true };
          types.set(type.toLowerCase(), row);
          return { rows: [row] };
        }
        if (sql.startsWith('UPDATE')) {
          const key = (values[1] as string).toLowerCase(),
            row = types.get(key);
          if (!row || row.is_active !== values[2]) return { rows: [] };
          const saved = { ...row, is_active: values[0] as boolean };
          types.set(key, saved);
          return { rows: [saved] };
        }
        if (sql.includes('WHERE LOWER(type)'))
          return {
            rows: types.has((values[0] as string).toLowerCase())
              ? [types.get((values[0] as string).toLowerCase())]
              : [],
          };
        const rows = [...types.values()];
        return {
          rows: (sql.includes('WHERE is_active = TRUE')
            ? rows.filter((row) => row.is_active)
            : rows
          ).sort(
            (a, b) =>
              Number(b.is_active) - Number(a.is_active) ||
              a.type.localeCompare(b.type),
          ),
        };
      });
  });
  const request = (path = '', method = 'GET', body?: unknown) =>
    fetch(`${baseUrl}/reference/id-types${path}`, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    });

  it('lists active strings and all records with active entries first', async () => {
    expect(await (await request()).json()).toEqual(['License']);
    expect(pool.query.mock.calls[0][0]).toContain(
      'WHERE is_active = TRUE ORDER BY type ASC',
    );
    expect(await (await request('/all')).json()).toEqual([
      { type: 'License', is_active: true },
      { type: 'Legacy LIB: LIBRARY', is_active: false },
    ]);
    expect(pool.query.mock.calls[1][0]).toContain(
      'ORDER BY is_active DESC, type ASC',
    );
  });
  it('creates a trimmed label, deactivates and reactivates without renaming or deleting it', async () => {
    let response = await request('', 'POST', { type: "  Owner's Card  " });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      type: "Owner's Card",
      is_active: true,
    });
    expect(pool.query.mock.calls[0][1]).toEqual(["Owner's Card"]);
    expect(pool.query.mock.calls[0][0]).toContain('ON CONFLICT DO NOTHING');
    expect(pool.query.mock.calls[0][0]).not.toContain("Owner's Card");
    response = await request('/deactivate', 'PATCH', {
      type: " owner's card ",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      type: "Owner's Card",
      is_active: false,
    });
    expect(pool.query.mock.calls[1][1]).toEqual([false, "owner's card", true]);
    expect(await (await request()).json()).not.toContain("Owner's Card");
    response = await request('/activate', 'PATCH', { type: "OWNER'S CARD" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      type: "Owner's Card",
      is_active: true,
    });
  });
  it.each(['license', 'LEGACY LIB: LIBRARY'])(
    'rejects case-insensitive duplicate %s, including inactive types',
    async (type) => {
      expect((await request('', 'POST', { type })).status).toBe(409);
      expect(types.size).toBe(2);
    },
  );
  it('returns 404 for missing types and 409 for unchanged state', async () => {
    expect(
      (await request('/activate', 'PATCH', { type: 'missing' })).status,
    ).toBe(404);
    expect(
      (await request('/deactivate', 'PATCH', { type: 'missing' })).status,
    ).toBe(404);
    expect(
      (await request('/activate', 'PATCH', { type: 'LICENSE' })).status,
    ).toBe(409);
    expect(
      (await request('/deactivate', 'PATCH', { type: 'Legacy LIB: LIBRARY' }))
        .status,
    ).toBe(409);
  });
  it.each([
    {},
    { type: '' },
    { type: '  ' },
    { type: null },
    { type: 123 },
    { type: 'a'.repeat(501) },
    { type: 'Card', is_active: false },
  ])('rejects invalid inputs before querying: %j', async (body) => {
    for (const [path, method] of [
      ['', 'POST'],
      ['/activate', 'PATCH'],
      ['/deactivate', 'PATCH'],
    ])
      expect((await request(path, method, body)).status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });
  it('preserves Unicode labels', async () => {
    expect((await request('', 'POST', { type: '居民身份证' })).status).toBe(
      201,
    );
    expect(types.get('居民身份证')).toEqual({
      type: '居民身份证',
      is_active: true,
    });
  });
  it('returns database errors as 500, not duplicate or missing responses', async () => {
    pool.query.mockRejectedValue(new Error('Database unavailable'));
    for (const [path, method] of [
      ['', 'GET'],
      ['/all', 'GET'],
      ['', 'POST'],
      ['/activate', 'PATCH'],
      ['/deactivate', 'PATCH'],
    ])
      expect(
        (
          await request(
            path,
            method,
            method === 'GET' ? undefined : { type: 'Card' },
          )
        ).status,
      ).toBe(500);
  });
  it('has no delete or rename endpoint', async () => {
    expect((await request('/License', 'DELETE')).status).toBe(404);
    expect(
      (await request('/License', 'PATCH', { type: 'Renamed' })).status,
    ).toBe(404);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
