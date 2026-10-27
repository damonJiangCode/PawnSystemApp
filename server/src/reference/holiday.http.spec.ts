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

describe('Holiday reference HTTP (mock PostgreSQL)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let holidays: Map<string, string>;
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
  afterAll(async () => app?.close());
  beforeEach(() => {
    holidays = new Map([
      ['2026-12-25', 'Christmas'],
      ['2026-01-01', 'New Year'],
    ]);
    pool.query
      .mockReset()
      .mockImplementation(async (sql: string, values: string[] = []) => {
        const [holiday_date, name] = values;
        if (sql.startsWith('INSERT')) {
          if (holidays.has(holiday_date)) return { rows: [] };
          holidays.set(holiday_date, name);
          return { rows: [{ holiday_date, name }] };
        }
        if (sql.startsWith('DELETE')) {
          if (!holidays.has(holiday_date)) return { rows: [] };
          const saved = { holiday_date, name: holidays.get(holiday_date) };
          holidays.delete(holiday_date);
          return { rows: [saved] };
        }
        return {
          rows: [...holidays]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([holiday_date, name]) => ({ holiday_date, name })),
        };
      });
  });
  const request = (path = '', method = 'GET', body?: unknown) =>
    fetch(`${baseUrl}/client/reference/holidays${path}`, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    });

  it('lists all years in date order and returns date-only strings', async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { holiday_date: '2026-01-01', name: 'New Year' },
      { holiday_date: '2026-12-25', name: 'Christmas' },
    ]);
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toContain('holiday_date::text AS holiday_date');
    expect(sql).toContain('ORDER BY holiday_date ASC');
  });

  it('returns an empty list when no holidays exist', async () => {
    holidays.clear();
    expect(await (await request()).json()).toEqual([]);
  });

  it('adds a trimmed holiday using SQL parameters and deletes by path date', async () => {
    const name = "  Founder's Day; --  ";
    let response = await request('', 'POST', {
      holiday_date: ' 2028-02-29 ',
      name,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      holiday_date: '2028-02-29',
      name: name.trim(),
    });
    expect(pool.query.mock.calls[0][1]).toEqual(['2028-02-29', name.trim()]);
    expect(pool.query.mock.calls[0][0]).toContain(
      'ON CONFLICT (holiday_date) DO NOTHING',
    );
    expect(pool.query.mock.calls[0][0]).not.toContain(name.trim());
    response = await request('/2028-02-29', 'DELETE');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      holiday_date: '2028-02-29',
      name: name.trim(),
    });
    expect(pool.query.mock.calls[1][0]).toContain('WHERE holiday_date = $1');
    expect(pool.query.mock.calls[1][1]).toEqual(['2028-02-29']);
    expect(holidays.has('2028-02-29')).toBe(false);
    expect((await request('/2028-02-29', 'DELETE')).status).toBe(404);
  });

  it('rejects a duplicate date without renaming the existing holiday', async () => {
    const response = await request('', 'POST', {
      holiday_date: '2026-12-25',
      name: 'Other name',
    });
    expect(response.status).toBe(409);
    expect(holidays.get('2026-12-25')).toBe('Christmas');
  });

  it('allows the same name on different dates and valid past holidays', async () => {
    for (const holiday_date of ['1999-01-01', '2000-02-29']) {
      expect(
        (await request('', 'POST', { holiday_date, name: 'New Year' })).status,
      ).toBe(201);
    }
  });

  it.each([
    '2026-02-29',
    '2026-04-31',
    '1900-02-29',
    '2026-13-01',
    '2026-00-01',
    '2026-01-00',
    '2026-01-32',
    '0000-01-01',
    '202666-01-01',
    '2026-1-01',
    '01-01-2026',
    '2026-01-01T00:00:00Z',
    'not-a-date',
  ])(
    'rejects invalid date %s for create and delete before querying',
    async (date) => {
      expect(
        (await request('', 'POST', { holiday_date: date, name: 'Holiday' }))
          .status,
      ).toBe(400);
      expect(
        (await request(`/${encodeURIComponent(date)}`, 'DELETE')).status,
      ).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    },
  );

  it.each([
    {},
    { holiday_date: null, name: 'Holiday' },
    { holiday_date: 20260101, name: 'Holiday' },
    { holiday_date: '2026-12-31' },
    { holiday_date: '2026-12-31', name: '' },
    { holiday_date: '2026-12-31', name: '  ' },
    { holiday_date: '2026-12-31', name: null },
    { holiday_date: '2026-12-31', name: 123 },
    { holiday_date: '2026-12-31', name: 'Holiday', is_active: true },
  ])('rejects missing/wrong/unknown fields: %j', async (body) => {
    expect((await request('', 'POST', body)).status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns 500 on database failures for every operation', async () => {
    pool.query.mockRejectedValue(new Error('Database unavailable'));
    expect((await request()).status).toBe(500);
    expect(
      (
        await request('', 'POST', {
          holiday_date: '2026-12-31',
          name: 'Holiday',
        })
      ).status,
    ).toBe(500);
    expect((await request('/2026-12-25', 'DELETE')).status).toBe(500);
  });

  it('does not expose update or activation routes', async () => {
    expect(
      (await request('/2026-12-25', 'PATCH', { name: 'Other' })).status,
    ).toBe(404);
    expect((await request('/activate', 'PATCH', {})).status).toBe(404);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
