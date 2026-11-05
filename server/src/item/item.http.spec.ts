import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
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

// A 1x1 PNG.
const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVQAAAABJRU5ErkJggg==';

describe('Item HTTP API (mock PostgreSQL)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let photoDir: string;
  // pool.query serves single reads; pool.connect() hands out the transaction
  // connection, whose queries are recorded in `sql`.
  const connection = { query: vi.fn(), release: vi.fn() };
  const pool = { query: vi.fn(), connect: vi.fn() };
  let rows: Record<string, unknown>[];
  let sql: string[];
  let ticketStatus: string | null;
  let subcategoryActive: boolean | null;
  let failItemInsert: boolean;
  // The item's current category, or null when it is not on the ticket.
  let ticketItemSubcategory: number | null;
  let failItemUpdate: boolean;
  let linkedItems: Record<string, unknown>[];

  beforeAll(async () => {
    photoDir = await mkdtemp(path.join(tmpdir(), 'pawn-item-photos-'));
    const module = await Test.createTestingModule({
      imports: [
        // Test-only config instead of the private .env.
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ ITEM_IMAGE_DIR: photoDir })],
        }),
        ItemModule,
      ],
    })
      .overrideProvider(Pool)
      .useValue(pool)
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });
  afterAll(async () => {
    await app?.close();
    await rm(photoDir, { recursive: true, force: true });
  });
  beforeEach(async () => {
    vi.resetAllMocks();
    rows = [itemRow()];
    sql = [];
    ticketStatus = 'pawned';
    subcategoryActive = true;
    failItemInsert = false;
    ticketItemSubcategory = 3;
    failItemUpdate = false;
    linkedItems = [];
    pool.query.mockImplementation(async () => ({ rows }));
    pool.connect.mockResolvedValue(connection);
    connection.query.mockImplementation(async (text: string) => {
      sql.push(text.trim().split(/\s+/).slice(0, 3).join(' '));
      if (text.includes('FROM ticket WHERE'))
        return { rows: ticketStatus ? [{ status: ticketStatus }] : [] };
      if (text.includes('FROM item_subcategory'))
        return {
          rows:
            subcategoryActive === null
              ? []
              : [{ is_active: subcategoryActive }],
        };
      if (text.includes('INSERT INTO item ')) {
        if (failItemInsert) throw new Error('insert failed');
        return { rows: [{ item_number: '41' }] };
      }
      if (text.includes('FROM ticket_item ti'))
        return {
          rows:
            ticketItemSubcategory === null
              ? []
              : [{ subcategory_id: ticketItemSubcategory }],
        };
      if (text.includes('UPDATE item') && failItemUpdate)
        throw new Error('update failed');
      if (text.includes('iws.item_number = ANY')) return { rows: linkedItems };
      if (text.includes('WHERE iws.item_number'))
        return { rows: [itemRow({ item_number: '41' })] };
      return { rows: [] };
    });
    for (const file of await readdir(photoDir)) {
      await rm(path.join(photoDir, file));
    }
  });

  const get = (path: string) => fetch(`${baseUrl}${path}`);
  const post = (path: string, body: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const patch = (path: string, body: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

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

  describe('POST /tickets/:ticketNumber/items', () => {
    const newItem = (overrides: Record<string, unknown> = {}) => ({
      quantity: 1,
      subcategory_id: 3,
      description: ' gold ring ',
      serial_number: 'sn1',
      amount: 120.5,
      photo: { fileName: 'x.png', base64: png },
      ...overrides,
    });
    const insertValues = () =>
      connection.query.mock.calls.find(([text]) =>
        String(text).includes('INSERT INTO item '),
      )?.[1];

    it('locks the ticket, saves and links the item in one transaction', async () => {
      const response = await post('/tickets/10/items', newItem());
      expect(response.status).toBe(201);
      expect((await response.json()).item_number).toBe(41);
      expect(sql).toEqual([
        'BEGIN',
        'SELECT status FROM',
        'SELECT is_active FROM',
        'INSERT INTO item',
        'INSERT INTO ticket_item',
        'SELECT iws.item_number, iws.quantity,',
        'COMMIT',
      ]);
      expect(String(connection.query.mock.calls[1][0])).toContain('FOR UPDATE');
      // Text is trimmed and upper-cased; missing text is blank.
      expect(insertValues()).toEqual([
        1,
        3,
        'GOLD RING',
        '',
        '',
        'SN1',
        120.5,
        expect.stringMatching(/^images\/items\//),
      ]);
      expect(connection.release).toHaveBeenCalled();
    });

    it('stores the photo under a server-made name', async () => {
      await post('/tickets/10/items', newItem());
      const [file] = await readdir(photoDir);
      expect(file).toMatch(/^[0-9a-f-]{36}\.png$/);
      expect(insertValues()?.[7]).toBe(`images/items/${file}`);
    });

    it('allows a price of 0', async () => {
      expect(
        (await post('/tickets/10/items', newItem({ amount: 0 }))).status,
      ).toBe(201);
    });

    it('rolls back and removes the new photo when saving the item fails', async () => {
      failItemInsert = true;
      const response = await post('/tickets/10/items', newItem());
      expect(response.status).toBe(500);
      expect(sql).toContain('ROLLBACK');
      expect(sql).not.toContain('COMMIT');
      expect(await readdir(photoDir)).toEqual([]);
    });

    it.each([
      [null, 404, 'Ticket #10 was not found.'],
      [
        'pawned_picked_up',
        409,
        'Items can only be changed on pawned or sold tickets.',
      ],
      [
        'sold_expired',
        409,
        'Items can only be changed on pawned or sold tickets.',
      ],
    ])('rejects a %s ticket without writing', async (status, code, message) => {
      ticketStatus = status;
      const response = await post('/tickets/10/items', newItem());
      expect(response.status).toBe(code);
      expect((await response.json()).message).toBe(message);
      expect(sql).not.toContain('INSERT INTO item');
      expect(sql).toContain('ROLLBACK');
      expect(await readdir(photoDir)).toEqual([]);
    });

    it.each([
      [null, 'Select a category.'],
      [false, 'Select an active category.'],
    ])('rejects subcategory state %s', async (active, message) => {
      subcategoryActive = active;
      const response = await post('/tickets/10/items', newItem());
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        field: 'subcategory_id',
        message,
      });
    });

    it.each([
      [{ quantity: 0 }, 'quantity', 'Quantity must be greater than 0.'],
      [{ subcategory_id: undefined }, 'subcategory_id', 'Select a category.'],
      [{ description: '   ' }, 'description', 'Description is required.'],
      [{ amount: -1 }, 'amount', 'Price cannot be negative.'],
      [
        { amount: 1.25 },
        'amount',
        'Enter a price with at most one decimal place.',
      ],
      [{ ticket_number: 10 }, 'ticket_number', undefined],
      [{ photo: undefined }, 'photo', 'Take an item photo.'],
      [{ photo: { fileName: 'x.png' } }, 'photo', undefined],
    ])(
      'rejects %j without opening a transaction',
      async (change, field, message) => {
        const response = await post('/tickets/10/items', newItem(change));
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.field).toBe(field);
        if (message) expect(body.message).toBe(message);
        expect(pool.connect).not.toHaveBeenCalled();
      },
    );

    it('rejects a file that is not an image and removes nothing else', async () => {
      const response = await post(
        '/tickets/10/items',
        newItem({
          photo: {
            fileName: 'x.png',
            base64: Buffer.from('hello').toString('base64'),
          },
        }),
      );
      expect(response.status).toBe(400);
      expect((await response.json()).message).toBe(
        'Upload a PNG or JPEG image up to 5 MB',
      );
      expect(sql).toContain('ROLLBACK');
      expect(await readdir(photoDir)).toEqual([]);
    });
  });

  describe('PATCH /tickets/:ticketNumber/items/:itemNumber', () => {
    const changes = (overrides: Record<string, unknown> = {}) => ({
      quantity: 2,
      subcategory_id: 3,
      description: ' gold ring ',
      serial_number: 'sn1',
      amount: 99.5,
      ...overrides,
    });
    const updateValues = () =>
      connection.query.mock.calls.find(([text]) =>
        String(text).includes('UPDATE item'),
      )?.[1];

    it('locks the ticket and the item, then saves the changes', async () => {
      const response = await patch('/tickets/10/items/41', changes());
      expect(response.status).toBe(200);
      expect((await response.json()).item_number).toBe(41);
      expect(sql).toEqual([
        'BEGIN',
        'SELECT status FROM',
        'SELECT i.subcategory_id FROM',
        'UPDATE item SET',
        'SELECT iws.item_number, iws.quantity,',
        'COMMIT',
      ]);
      expect(String(connection.query.mock.calls[2][0])).toContain(
        'FOR UPDATE OF i',
      );
      expect(connection.query.mock.calls[2][1]).toEqual([10, 41]);
      // No photo: null keeps the current image_path.
      expect(updateValues()).toEqual([
        2,
        3,
        'GOLD RING',
        '',
        '',
        'SN1',
        99.5,
        null,
        41,
      ]);
      expect(await readdir(photoDir)).toEqual([]);
    });

    it('stores a new photo and points the item at it', async () => {
      await patch(
        '/tickets/10/items/41',
        changes({ photo: { fileName: 'x.png', base64: png } }),
      );
      const [file] = await readdir(photoDir);
      expect(updateValues()?.[7]).toBe(`images/items/${file}`);
    });

    it('rolls back and removes the new photo when the update fails', async () => {
      failItemUpdate = true;
      const response = await patch(
        '/tickets/10/items/41',
        changes({ photo: { fileName: 'x.png', base64: png } }),
      );
      expect(response.status).toBe(500);
      expect(sql).toContain('ROLLBACK');
      expect(await readdir(photoDir)).toEqual([]);
    });

    it('keeps a category that was deactivated after the item was saved', async () => {
      subcategoryActive = false;
      const response = await patch('/tickets/10/items/41', changes());
      expect(response.status).toBe(200);
      expect(sql).not.toContain('SELECT is_active FROM');
    });

    it('only allows changing to an active category', async () => {
      subcategoryActive = false;
      const response = await patch(
        '/tickets/10/items/41',
        changes({ subcategory_id: 5 }),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        field: 'subcategory_id',
        message: 'Select an active category.',
      });
      expect(sql).not.toContain('UPDATE item SET');
    });

    it('rejects an item that is not on the ticket', async () => {
      ticketItemSubcategory = null;
      const response = await patch(
        '/tickets/10/items/41',
        changes({ photo: { fileName: 'x.png', base64: png } }),
      );
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({
        field: 'item_number',
        message: 'Item #41 is not on ticket #10.',
      });
      expect(sql).not.toContain('UPDATE item SET');
      expect(await readdir(photoDir)).toEqual([]);
    });

    it('rejects a closed ticket without touching the item', async () => {
      ticketStatus = 'pawned_picked_up';
      const response = await patch('/tickets/10/items/41', changes());
      expect(response.status).toBe(409);
      expect(sql).not.toContain('SELECT i.subcategory_id FROM');
    });

    it.each([
      ['/tickets/10/items/abc', changes(), 'itemNumber'],
      ['/tickets/10/items/41', changes({ quantity: 0 }), 'quantity'],
      ['/tickets/10/items/41', changes({ image_path: 'x.png' }), 'image_path'],
    ])(
      'rejects %s %j without opening a transaction',
      async (url, body, field) => {
        const response = await patch(url, body);
        expect(response.status).toBe(400);
        expect((await response.json()).field).toBe(field);
        expect(pool.connect).not.toHaveBeenCalled();
      },
    );
  });

  describe('DELETE /tickets/:ticketNumber/items/:itemNumber', () => {
    const remove = (path: string) =>
      fetch(`${baseUrl}${path}`, { method: 'DELETE' });

    it('removes only the link to the ticket and returns no content', async () => {
      const response = await remove('/tickets/10/items/41');
      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
      expect(sql).toEqual([
        'BEGIN',
        'SELECT status FROM',
        'SELECT i.subcategory_id FROM',
        'DELETE FROM ticket_item',
        'COMMIT',
      ]);
      expect(connection.query.mock.calls[3][1]).toEqual([10, 41]);
    });

    it('rejects an item that is not on the ticket', async () => {
      ticketItemSubcategory = null;
      const response = await remove('/tickets/10/items/41');
      expect(response.status).toBe(404);
      expect((await response.json()).message).toBe(
        'Item #41 is not on ticket #10.',
      );
      expect(sql).not.toContain('DELETE FROM ticket_item');
    });

    it.each([
      [null, 404],
      ['pawned_picked_up', 409],
    ])('rejects a %s ticket without deleting', async (status, code) => {
      ticketStatus = status;
      const response = await remove('/tickets/10/items/41');
      expect(response.status).toBe(code);
      expect(sql).not.toContain('DELETE FROM ticket_item');
      expect(sql).toContain('ROLLBACK');
    });

    it('rejects an invalid item number without opening a transaction', async () => {
      const response = await remove('/tickets/10/items/abc');
      expect(response.status).toBe(400);
      expect((await response.json()).field).toBe('itemNumber');
      expect(pool.connect).not.toHaveBeenCalled();
    });
  });

  describe('POST /tickets/:ticketNumber/items/link', () => {
    const closedItem = (itemNumber: string) =>
      itemRow({
        item_number: itemNumber,
        latest_ticket_number: 5,
        latest_ticket_status: 'pawned_picked_up',
      });
    const linkCalls = () =>
      connection.query.mock.calls.filter(([text]) =>
        String(text).includes('INSERT INTO ticket_item'),
      );

    it('locks the items before checking them and links them all', async () => {
      linkedItems = [closedItem('41'), closedItem('42')];
      const response = await post('/tickets/10/items/link', {
        item_numbers: [42, 41, 42],
      });
      expect(response.status).toBe(200);
      expect(
        (await response.json()).map(
          (item: { item_number: number }) => item.item_number,
        ),
      ).toEqual([41, 42]);
      expect(sql).toEqual([
        'BEGIN',
        'SELECT status FROM',
        'SELECT item_number FROM',
        'SELECT iws.item_number, iws.quantity,',
        'INSERT INTO ticket_item',
        'INSERT INTO ticket_item',
        'SELECT iws.item_number, iws.quantity,',
        'COMMIT',
      ]);
      const lock = connection.query.mock.calls[2];
      expect(String(lock[0])).toMatch(/ORDER BY item_number\s+FOR UPDATE/);
      // Duplicates are dropped.
      expect(lock[1]).toEqual([[42, 41]]);
      expect(linkCalls().map(([, values]) => values)).toEqual([
        [10, 42],
        [10, 41],
      ]);
    });

    it('accepts an item with no ticket and one already on this ticket', async () => {
      linkedItems = [
        itemRow({
          item_number: '41',
          latest_ticket_number: null,
          latest_ticket_status: null,
        }),
        itemRow({ item_number: '42', latest_ticket_number: 10 }),
      ];
      const response = await post('/tickets/10/items/link', {
        item_numbers: [41, 42],
      });
      expect(response.status).toBe(200);
    });

    it('links nothing when one item is active on another ticket', async () => {
      linkedItems = [
        closedItem('41'),
        itemRow({ item_number: '42', latest_ticket_number: 7 }),
      ];
      const response = await post('/tickets/10/items/link', {
        item_numbers: [41, 42],
      });
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        field: 'item_numbers',
        message: 'Item #42 is already active on ticket #7.',
      });
      expect(linkCalls()).toEqual([]);
      expect(sql).toContain('ROLLBACK');
    });

    it('links nothing when one item does not exist', async () => {
      linkedItems = [closedItem('41')];
      const response = await post('/tickets/10/items/link', {
        item_numbers: [41, 42],
      });
      expect(response.status).toBe(404);
      expect((await response.json()).message).toBe('Item #42 was not found.');
      expect(linkCalls()).toEqual([]);
    });

    it.each([
      [null, 404],
      ['sold_expired', 409],
    ])('rejects a %s ticket before locking items', async (status, code) => {
      ticketStatus = status;
      const response = await post('/tickets/10/items/link', {
        item_numbers: [41],
      });
      expect(response.status).toBe(code);
      expect(sql).not.toContain('SELECT item_number FROM');
    });

    it.each([
      [{ item_numbers: [] }, 'Select at least one item.'],
      // The pipe prefers the isInt message when the list itself is malformed.
      [{}, 'Enter a valid item number.'],
      [{ item_numbers: '41' }, 'Enter a valid item number.'],
      [{ item_numbers: [0] }, 'Enter a valid item number.'],
      [{ item_numbers: [1.5] }, 'Enter a valid item number.'],
      [
        { item_numbers: Array.from({ length: 1001 }, (_, i) => i + 1) },
        'Select at most 1000 items.',
      ],
    ])('rejects %j without opening a transaction', async (body, message) => {
      const response = await post('/tickets/10/items/link', body);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        field: 'item_numbers',
        message,
      });
      expect(pool.connect).not.toHaveBeenCalled();
    });
  });
});
