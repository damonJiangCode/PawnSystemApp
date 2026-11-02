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
  item_number: 40,
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
});
