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

describe('Color administration HTTP (mock PostgreSQL)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const pool = { query: vi.fn() };
  let tables: Record<string, Map<string, boolean>>;

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
    tables = {
      hair: new Map([
        ['BLACK', true],
        ['BLUE', false],
      ]),
      eye: new Map([
        ['BROWN', true],
        ['GREEN', false],
      ]),
    };
    pool.query
      .mockReset()
      .mockImplementation(async (sql: string, values: unknown[] = []) => {
        const table = tables[sql.includes('hair_color') ? 'hair' : 'eye'];
        if (sql.startsWith('INSERT')) {
          const color = values[0] as string;
          if (table.has(color)) return { rows: [] };
          table.set(color, true);
          return { rows: [{ color }] };
        }
        if (sql.startsWith('UPDATE')) {
          const color = values[1] as string;
          if (!table.has(color) || table.get(color) !== values[2])
            return { rows: [] };
          table.set(color, values[0] as boolean);
          return { rows: [{ color, is_active: values[0] }] };
        }
        if (sql.includes('WHERE UPPER(color) = $1')) {
          const color = values[0] as string;
          return {
            rows: table.has(color)
              ? [{ color, is_active: table.get(color) }]
              : [],
          };
        }
        const rows = [...table].map(([color, is_active]) => ({
          color,
          is_active,
        }));
        if (sql.includes('WHERE is_active = TRUE'))
          return {
            rows: rows
              .filter((row) => row.is_active)
              .sort((a, b) => a.color.localeCompare(b.color)),
          };
        return {
          rows: rows.sort(
            (a, b) =>
              Number(b.is_active) - Number(a.is_active) ||
              a.color.localeCompare(b.color),
          ),
        };
      });
  });
  const request = (kind: string, path = '', method = 'GET', body?: unknown) =>
    fetch(`${baseUrl}/client/reference/${kind}-colors${path}`, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    });

  for (const kind of ['hair', 'eye']) {
    it(`${kind}: lists all colors with active entries first`, async () => {
      const response = await request(kind, '/all');
      expect(response.status).toBe(200);
      const rows = await response.json();
      expect(rows.map((row: { is_active: boolean }) => row.is_active)).toEqual([
        true,
        false,
      ]);
      expect(pool.query.mock.calls[0][0]).toContain(
        `FROM ${kind}_color ORDER BY is_active DESC, color ASC`,
      );
    });

    it(`${kind}: adds, deactivates and reactivates without deleting the option`, async () => {
      let response = await request(kind, '', 'POST', { color: ' pink ' });
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ color: 'PINK' });
      expect(pool.query.mock.calls[0][0]).toContain(
        'ON CONFLICT (color) DO NOTHING',
      );
      expect(pool.query.mock.calls[0][1]).toEqual(['PINK']);

      response = await request(kind, '/deactivate', 'PATCH', { color: 'pink' });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        color: 'PINK',
        is_active: false,
      });
      response = await request(kind);
      expect(await response.json()).not.toContain('PINK');
      response = await request(kind, '/all');
      expect(await response.json()).toContainEqual({
        color: 'PINK',
        is_active: false,
      });

      response = await request(kind, '/activate', 'PATCH', { color: ' PINK ' });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ color: 'PINK', is_active: true });
      response = await request(kind);
      expect(await response.json()).toContain('PINK');
    });

    it(`${kind}: rejects duplicates even when the existing color is inactive`, async () => {
      const existing = kind === 'hair' ? 'blue' : 'green';
      const response = await request(kind, '', 'POST', {
        color: ` ${existing} `,
      });
      expect(response.status).toBe(409);
      expect(tables[kind].get(existing.toUpperCase())).toBe(false);
    });

    it(`${kind}: distinguishes missing colors from already-applied states`, async () => {
      let response = await request(kind, '/activate', 'PATCH', {
        color: 'MISSING',
      });
      expect(response.status).toBe(404);
      response = await request(kind, '/activate', 'PATCH', {
        color: kind === 'hair' ? 'BLACK' : 'BROWN',
      });
      expect(response.status).toBe(409);
      response = await request(kind, '/deactivate', 'PATCH', {
        color: kind === 'hair' ? 'BLUE' : 'GREEN',
      });
      expect(response.status).toBe(409);
    });

    it.each([
      {},
      { color: '' },
      { color: '   ' },
      { color: null },
      { color: 123 },
      { color: 'x'.repeat(501) },
      { color: 'PINK', is_active: false },
    ])(
      `${kind}: rejects invalid POST/PATCH inputs before SQL (%j)`,
      async (body) => {
        for (const [path, method] of [
          ['', 'POST'],
          ['/activate', 'PATCH'],
          ['/deactivate', 'PATCH'],
        ]) {
          const response = await request(kind, path, method, body);
          expect(response.status).toBe(400);
        }
        expect(pool.query).not.toHaveBeenCalled();
      },
    );
  }

  it('keeps user text in SQL parameters and isolates the selected color table', async () => {
    const color = "O'NEIL";
    const response = await request('eye', '', 'POST', { color });
    expect(response.status).toBe(201);
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO eye_color');
    expect(sql).not.toContain(color);
    expect(values).toEqual([color]);
    expect(tables.hair.has(color)).toBe(false);
  });
});
