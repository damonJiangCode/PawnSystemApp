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

describe('Item category reference HTTP (mock PostgreSQL)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const pool = { query: vi.fn(), connect: vi.fn() };
  const category = { category_id: 1, category_name: 'Tools', is_active: true };
  const subcategory = {
    subcategory_id: 2,
    category_id: 1,
    subcategory_name: 'Drills',
    is_active: true,
  };
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
    vi.resetAllMocks();
  });
  const request = (path: string, method = 'GET', body?: unknown) =>
    fetch(`${baseUrl}/reference/${path}`, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    });

  it('lists all categories, preserving child state and empty categories', async () => {
    pool.query.mockResolvedValue({
      rows: [
        {
          ...category,
          is_active: false,
          subcategory_id: 2,
          subcategory_name: 'Drills',
          subcategory_is_active: true,
        },
        {
          ...category,
          is_active: false,
          subcategory_id: 3,
          subcategory_name: 'Saws',
          subcategory_is_active: false,
        },
        {
          category_id: 4,
          category_name: 'Empty',
          is_active: true,
          subcategory_id: null,
          subcategory_name: null,
          subcategory_is_active: null,
        },
      ],
    });
    const response = await request('item-categories/all');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        ...category,
        is_active: false,
        subcategories: [
          subcategory,
          {
            ...subcategory,
            subcategory_id: 3,
            subcategory_name: 'Saws',
            is_active: false,
          },
        ],
      },
      {
        category_id: 4,
        category_name: 'Empty',
        is_active: true,
        subcategories: [],
      },
    ]);
    expect(pool.query.mock.calls[0][0]).toContain('LEFT JOIN');
    expect(pool.query.mock.calls[0][0]).not.toContain('WHERE');
  });

  it('creates a category from its trimmed name only', async () => {
    pool.query.mockResolvedValue({ rows: [category] });
    const response = await request('item-categories', 'POST', {
      category_name: ' Tools ',
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(category);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO item_category'),
      ['Tools'],
    );
    expect(pool.query.mock.calls[0][0]).toContain('ON CONFLICT DO NOTHING');
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('rejects a duplicate category, including case and space variants', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const response = await request('item-categories', 'POST', {
      category_name: 'tools',
    });
    expect(response.status).toBe(409);
    expect((await response.json()).message).toBe(
      'That category already exists.',
    );
  });

  it.each([
    {},
    { category_name: ' ' },
    { category_name: 5 },
    { category_name: 'x'.repeat(501) },
    { category_name: 'Tools', subcategory_name: 'Drills' },
    { category_id: 1, category_name: 'Tools' },
  ])(
    'rejects invalid category input before touching the database',
    async (body) => {
      expect((await request('item-categories', 'POST', body)).status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    },
  );

  it('creates a subcategory only under an active parent in one statement', async () => {
    pool.query.mockResolvedValue({ rows: [subcategory] });
    const response = await request('item-subcategories', 'POST', {
      category_id: 1,
      subcategory_name: ' Drills ',
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(subcategory);
    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO item_subcategory');
    expect(sql).toContain('FROM item_category WHERE id = $1 AND is_active');
    expect(sql).toContain('ON CONFLICT DO NOTHING');
    expect(params).toEqual([1, 'Drills']);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing parent', [], 404, 'That category was not found.'],
    [
      'an inactive parent',
      [{ is_active: false }],
      409,
      'Activate that category before adding a subcategory.',
    ],
    [
      'a duplicate subcategory',
      [{ is_active: true }],
      409,
      'That subcategory already exists in this category.',
    ],
  ])(
    'explains a skipped insert caused by %s',
    async (_label, parentRows, status, message) => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: parentRows });
      const response = await request('item-subcategories', 'POST', {
        category_id: 1,
        subcategory_name: 'Drills',
      });
      expect(response.status).toBe(status);
      expect((await response.json()).message).toBe(message);
      expect(pool.query).toHaveBeenLastCalledWith(
        'SELECT is_active FROM item_category WHERE id = $1',
        [1],
      );
    },
  );

  it.each([
    {},
    { category_id: 1 },
    { subcategory_name: 'Drills' },
    { category_name: 'Tools', subcategory_name: 'Drills' },
    { category_id: '1', subcategory_name: 'Drills' },
    { category_id: 0, subcategory_name: 'Drills' },
    { category_id: 2147483648, subcategory_name: 'Drills' },
    { category_id: 1, subcategory_name: ' ' },
    { category_id: 1, subcategory_name: 'Drills', extra: true },
  ])(
    'rejects invalid subcategory input before touching the database',
    async (body) => {
      expect((await request('item-subcategories', 'POST', body)).status).toBe(
        400,
      );
      expect(pool.query).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['item-categories', { category_name: 'Tools' }],
    ['item-subcategories', { category_id: 1, subcategory_name: 'Drills' }],
  ])('hides database details when %s creation fails', async (path, body) => {
    pool.query.mockRejectedValue(new Error('private SQL details'));
    const response = await request(path, 'POST', body);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('private SQL');
  });

  it.each(['item-categories', 'item-subcategories'])(
    'updates only %s and is idempotent',
    async (resource) => {
      const record = resource === 'item-categories' ? category : subcategory;
      pool.query.mockResolvedValue({ rows: [{ ...record, is_active: false }] });
      for (let i = 0; i < 2; i++) {
        const response = await request(`${resource}/1`, 'PATCH', {
          is_active: false,
        });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ...record, is_active: false });
      }
      expect(pool.query).toHaveBeenCalledTimes(2);
      const table =
        resource === 'item-categories' ? 'item_category' : 'item_subcategory';
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          `UPDATE ${table} SET is_active = $1 WHERE id = $2`,
        ),
        [false, 1],
      );
      expect(pool.connect).not.toHaveBeenCalled();
    },
  );

  it.each(['item-categories', 'item-subcategories'])(
    'returns 404 for missing %s',
    async (resource) => {
      pool.query.mockResolvedValue({ rows: [] });
      expect(
        (await request(`${resource}/999`, 'PATCH', { is_active: true })).status,
      ).toBe(404);
    },
  );

  it.each([
    ['0', { is_active: true }],
    ['abc', { is_active: true }],
    ['1.5', { is_active: true }],
    ['2147483648', { is_active: true }],
    ['1', { is_active: 'false' }],
    ['1', {}],
    ['1', { is_active: false, name: 'renamed' }],
  ])('rejects invalid status input', async (id, body) => {
    expect((await request(`item-categories/${id}`, 'PATCH', body)).status).toBe(
      400,
    );
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('does not expose deletion', async () => {
    expect((await request('item-categories/1', 'DELETE')).status).toBe(404);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
