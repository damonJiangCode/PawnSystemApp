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
import { ItemModule } from './item.module.js';

const itemRow = (overrides: Record<string, unknown> = {}) => ({
  item_number: '40',
  quantity: 1,
  subcategory_id: 3,
  category_name: 'JEWELLERY',
  subcategory_name: 'RING',
  description: 'GOLD RING',
  brand_name: null,
  model_number: null,
  serial_number: 'SN1',
  amount: '120.5',
  latest_ticket_number: 10,
  latest_ticket_status: 'pawned',
  image_path: 'images/items/a.png',
  ...overrides,
});

describe('Item HTTP API (mock PostgreSQL)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const pool = { query: vi.fn(), connect: vi.fn() };
  let rows: Record<string, unknown>[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [ItemModule] })
      .overrideProvider(Pool)
      .useValue(pool)
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    vi.resetAllMocks();
    rows = [itemRow()];
    pool.query.mockImplementation(async () => ({ rows }));
  });

  const get = (path: string) => fetch(`${baseUrl}${path}`);

  describe('GET /tickets/:ticketNumber/items', () => {
    it('lists the ticket’s items with numeric amounts and blank optional text', async () => {
      const response = await get('/tickets/10/items');
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([
        {
          item_number: 40,
          quantity: 1,
          subcategory_id: 3,
          category_name: 'JEWELLERY',
          subcategory_name: 'RING',
          description: 'GOLD RING',
          brand_name: '',
          model_number: '',
          serial_number: 'SN1',
          amount: 120.5,
          latest_ticket_number: 10,
          latest_ticket_status: 'pawned',
          is_loadable: false,
          image_path: 'images/items/a.png',
        },
      ]);
      const [sql, values] = pool.query.mock.calls[0];
      expect(sql).toContain('WHERE ti.ticket_number = $1');
      expect(sql).toContain('ORDER BY iws.item_number DESC');
      expect(values).toEqual([10]);
    });

    it.each([
      ['pawned_picked_up', true],
      ['sold', false],
      [null, true],
    ])(
      'marks an item on a %s ticket loadable: %s',
      async (status, loadable) => {
        rows = [itemRow({ latest_ticket_status: status })];
        const [item] = await (await get('/tickets/10/items')).json();
        expect(item.is_loadable).toBe(loadable);
      },
    );

    it('returns an empty list for a ticket without items', async () => {
      rows = [];
      const response = await get('/tickets/99/items');
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([]);
    });

    it.each(['0', 'abc', '2147483648'])(
      'rejects ticket number %s without querying',
      async (ticketNumber) => {
        const response = await get(`/tickets/${ticketNumber}/items`);
        expect(response.status).toBe(400);
        expect((await response.json()).field).toBe('ticketNumber');
        expect(pool.query).not.toHaveBeenCalled();
      },
    );
  });

  describe('GET /items/search', () => {
    const search = async (query: string) => {
      const response = await get(`/items/search?${query}`);
      const [sql, values] = pool.query.mock.calls[0] ?? [];
      return { response, sql: String(sql ?? ''), values };
    };

    it('lists every item a client has pawned or sold', async () => {
      const { response, sql, values } = await search('client_number=7');
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        items: [{ item_number: 40 }],
        truncated: false,
      });
      expect(sql).toContain('WHERE t.client_number = $1');
      expect(sql).toContain('LIMIT $2');
      expect(values).toEqual([7, 1001]);
    });

    it('combines text filters, trimmed and upper-cased, as partial matches', async () => {
      const { sql, values } = await search(
        'category_id=2&subcategory_id=3&brand_name=%20apple%20&model_number=x1&serial_number=sn',
      );
      expect(sql).toContain('FROM item_category WHERE id = $1');
      expect(sql).toContain('iws.subcategory_id = $2');
      expect(sql).toContain('iws.brand_name ILIKE $3');
      expect(sql).toContain('iws.model_number ILIKE $4');
      expect(sql).toContain('iws.serial_number ILIKE $5');
      expect(values).toEqual([2, 3, '%APPLE%', '%X1%', '%SN%', 1001]);
    });

    it('matches an item number exactly and ignores the other filters', async () => {
      const { sql, values } = await search('item_number=40&brand_name=apple');
      expect(sql).toContain('iws.item_number = $1');
      expect(sql).not.toContain('ILIKE');
      expect(values).toEqual([40, 1001]);
    });

    it('returns the newest 1000 and flags that more matched', async () => {
      rows = Array.from({ length: 1001 }, (_, i) =>
        itemRow({ item_number: String(2000 - i) }),
      );
      const body = await (await get('/items/search?brand_name=a')).json();
      expect(body.items).toHaveLength(1000);
      expect(body.items[999].item_number).toBe(1001);
      expect(body.truncated).toBe(true);
    });

    it.each(['', 'brand_name=%20%20'])(
      'returns nothing for an empty search (%s) without querying',
      async (query) => {
        const { response } = await search(query);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ items: [], truncated: false });
        expect(pool.query).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['client_number=0', 'client_number', 'Select a valid client.'],
      ['item_number=abc', 'item_number', 'Enter a valid item number.'],
      ['category_id=-1', 'category_id', undefined],
      ['brand_name=' + 'A'.repeat(101), 'brand_name', undefined],
      ['size=10', 'size', undefined],
    ])('rejects %s', async (query, field, message) => {
      const { response } = await search(query);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.field).toBe(field);
      if (message) expect(body.message).toBe(message);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });
});
