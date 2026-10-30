import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { EmployeePinHasher } from '../employee/employee-pin.hasher.js';
import { TicketModule } from './ticket.module.js';

const SECRET = 'a'.repeat(32);
const pins = new EmployeePinHasher(
  new ConfigService({ EMPLOYEE_PIN_SECRET: SECRET }),
);
const DAY = 24 * 60 * 60 * 1000;
// Wednesday noon in Regina.
const NOW = new Date('2026-05-13T18:00:00Z');
const PAWNED_AT = new Date('2026-05-11T18:00:00Z');
const FUTURE_DUE = new Date('2026-06-10T18:00:00Z');
const PAST_DUE = new Date('2026-05-10T18:00:00Z');

type Row = Record<string, unknown>;
type ClientRow = {
  is_active: boolean;
  notes: string;
  sell_count: number;
  expire_count: number;
  redeem_count: number;
};

const ticket = (overrides: Row = {}): Row => ({
  ticket_number: 10,
  transaction_datetime: PAWNED_AT,
  is_lost: false,
  is_stolen: false,
  location: 'A1',
  description: 'RING',
  due_date: FUTURE_DUE,
  amount: '100.0',
  onetime_fee: '5.0',
  interest_paid_months: 0,
  interested_datetime: null,
  employee_name: 'OLD',
  pickup_datetime: null,
  pickup_amount_paid: null,
  expire_date: null,
  status: 'pawned',
  status_updated_at: PAWNED_AT,
  client_number: 1,
  recorded_interest_amount_paid: '0',
  recorded_interest_months_paid: '0',
  ...overrides,
});

describe('Ticket actions HTTP (in-memory PostgreSQL fake)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const pool = { query: vi.fn(), connect: vi.fn() };
  const connection = { query: vi.fn(), release: vi.fn() };
  let tickets: Map<number, Row>;
  let clients: Map<number, ClientRow>;
  let activeLocations: Set<string>;
  let linkedConflict: Row | null;
  let reversals: Row[];
  let interestPayments: unknown[][];
  let clientLocks: number[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ EMPLOYEE_PIN_SECRET: SECRET })],
        }),
        TicketModule,
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
    vi.useRealTimers();
    await app?.close();
  });

  const client = (overrides: Partial<ClientRow> = {}): ClientRow => ({
    is_active: true,
    notes: 'Regular',
    sell_count: 2,
    expire_count: 2,
    redeem_count: 2,
    ...overrides,
  });
  const reload = (n: number) => {
    const row = tickets.get(n);
    return { rows: row ? [{ ...row }] : [] };
  };

  // A tiny fake that applies each repository statement to the maps above, so
  // tests can assert outcomes (status, counters, notes) instead of SQL text.
  const run = async (sql: string, v: unknown[] = []) => {
    const n = v[0] as number;
    const t = tickets.get(n);
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql)) return { rows: [] };
    if (sql.includes('FOR UPDATE OF t'))
      return {
        rows: (v[0] as number[])
          .filter((number) => tickets.has(number))
          .sort((a, b) => a - b)
          .map((number) => ({ ...tickets.get(number)! })),
      };
    if (sql.includes('FROM ticket t') && sql.includes('t.ticket_number = $1'))
      return reload(n);
    if (sql.includes('FROM client WHERE client_number = $1 FOR UPDATE')) {
      clientLocks.push(n);
      const row = clients.get(n);
      return { rows: row ? [{ is_active: row.is_active }] : [] };
    }
    if (sql.includes('FROM location'))
      return {
        rows: [{ is_active: activeLocations.has(v[0] as string) }],
      };
    if (sql.includes('FROM employee'))
      return {
        rows:
          v[0] === pins.hash('1234')
            ? [{ employee_number: 3, first_name: 'ANNA', nickname: 'AL' }]
            : [],
      };
    if (sql.includes('SET is_lost')) {
      Object.assign(t!, {
        is_lost: v[1],
        location: v[2],
        description: v[3],
        amount: String(v[4]),
        onetime_fee: String(v[5]),
        employee_name: v[6],
      });
      return { rows: [] };
    }
    if (sql.includes('SET status = $2, location')) {
      Object.assign(t!, {
        status: v[1],
        location: v[2],
        description: v[3],
        amount: String(v[4]),
        onetime_fee: String(v[5]),
        due_date: v[6],
        employee_name: v[7],
        status_updated_at: v[8],
      });
      return { rows: [] };
    }
    if (sql.includes('SET client_number')) {
      t!.client_number = v[1];
      return { rows: [] };
    }
    if (sql.includes('WITH picked AS')) {
      const [at, numbers, amounts] = v as [Date, number[], number[]];
      const picked = numbers.filter((number, i) => {
        const row = tickets.get(number)!;
        if (row.status !== 'pawned') return false;
        Object.assign(row, {
          status: 'pawned_picked_up',
          pickup_datetime: at,
          pickup_amount_paid: String(amounts[i]),
        });
        clients.get(row.client_number as number)!.redeem_count += 1;
        return true;
      });
      return { rows: picked.map((ticket_number) => ({ ticket_number })) };
    }
    if (sql.includes('SET due_date = $2')) {
      Object.assign(t!, {
        due_date: v[1],
        interest_paid_months:
          (t!.interest_paid_months as number) + (v[2] as number),
        interested_datetime: v[3],
      });
      return { rows: [] };
    }
    if (sql.includes('INSERT INTO interest_payment')) {
      interestPayments.push(v);
      t!.recorded_interest_amount_paid = String(v[2]);
      return { rows: [] };
    }
    if (sql.includes('expire_date = $3')) {
      Object.assign(t!, { status: v[1], expire_date: v[2] });
      return { rows: [] };
    }
    if (sql.includes('SET is_stolen')) {
      t!.is_stolen = v[1];
      return { rows: [] };
    }
    if (sql.includes('FROM ticket_item'))
      return { rows: linkedConflict ? [linkedConflict] : [] };
    if (sql.includes('INSERT INTO ticket_reversal')) {
      reversals.push({ previous_status: v[1], previous_amount: v[3] });
      return { rows: [] };
    }
    if (sql.includes("SET status = 'pawned', pickup_datetime = NULL")) {
      Object.assign(t!, {
        status: 'pawned',
        pickup_datetime: null,
        pickup_amount_paid: null,
        expire_date: null,
      });
      return { rows: [] };
    }
    const counter = sql.match(/SET (\w+_count) = GREATEST/);
    if (counter) {
      const row = clients.get(n)!;
      const column = counter[1] as 'sell_count';
      row[column] = Math.max(0, row[column] + (v[1] as number));
      return { rows: [] };
    }
    if (sql.includes('SET notes')) {
      const row = clients.get(n)!;
      row.notes = row.notes ? `${row.notes} ${v[1]}` : (v[1] as string);
      return { rows: [] };
    }
    if (sql.includes('FROM client c'))
      return { rows: [{ client_number: n, ...clients.get(n) }] };
    throw new Error(`Unexpected SQL in test: ${sql.slice(0, 60)}`);
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    tickets = new Map([[10, ticket()]]);
    clients = new Map([
      [1, client()],
      [2, client()],
    ]);
    activeLocations = new Set(['A1', 'B2']);
    linkedConflict = null;
    reversals = [];
    interestPayments = [];
    clientLocks = [];
    pool.connect.mockResolvedValue(connection);
    connection.query.mockImplementation(run);
    pool.query.mockImplementation(async (sql: string, v: unknown[] = []) => {
      if (sql.includes('FROM holiday_date')) return { rows: [] };
      if (sql.includes('INNER JOIN client c')) {
        const row = tickets.get(v[0] as number);
        if (!row) return { rows: [] };
        const owner = clients.get(row.client_number as number)!;
        return {
          rows: [
            {
              ...row,
              previous_client_number: row.client_number,
              previous_client_name: 'LEE, ANN',
              previous_client_is_active: owner.is_active,
            },
          ],
        };
      }
      return { rows: [] };
    });
  });

  const call = (method: string, path: string, body?: unknown) =>
    fetch(`${baseUrl}/tickets${path}`, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    });
  const expectError = async (
    response: Response,
    status: number,
    message: string,
  ) => {
    expect(response.status).toBe(status);
    expect((await response.json()).message).toBe(message);
    expect(connection.query).not.toHaveBeenCalledWith('COMMIT');
  };
  const details = (overrides: Row = {}) => ({
    description: 'GOLD RING',
    location: 'B2',
    amount: 100,
    onetime_fee: 5,
    employee_password: '1234',
    ...overrides,
  });

  describe('PATCH /tickets/:n (edit)', () => {
    it('updates an open ticket and records the editor', async () => {
      const response = await call('PATCH', '/10', {
        ...details({ location: ' b2 ' }),
        is_lost: true,
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        location: 'B2',
        description: 'GOLD RING',
        is_lost: true,
        employee_name: 'AL',
        earliest_pickup_date: '2026-05-14',
      });
    });

    it('rejects closed tickets', async () => {
      tickets.set(10, ticket({ status: 'pawned_picked_up' }));
      await expectError(
        await call('PATCH', '/10', { ...details(), is_lost: false }),
        409,
        'Only pawned or sold tickets can be edited.',
      );
    });

    it('requires a sell amount above 0 and never stores a fee on a sell', async () => {
      tickets.set(10, ticket({ status: 'sold', onetime_fee: '0' }));
      await expectError(
        await call('PATCH', '/10', {
          ...details({ amount: 0 }),
          is_lost: false,
        }),
        400,
        'Amount must be greater than 0.',
      );
      const response = await call('PATCH', '/10', {
        ...details({ onetime_fee: 9 }),
        is_lost: false,
      });
      expect((await response.json()).onetime_fee).toBe(0);
    });

    it('locks the amount of an overdue pawn but allows other edits', async () => {
      tickets.set(10, ticket({ due_date: PAST_DUE }));
      await expectError(
        await call('PATCH', '/10', {
          ...details({ amount: 90 }),
          is_lost: false,
        }),
        409,
        'This ticket is overdue. Its amount cannot be changed.',
      );
      const response = await call('PATCH', '/10', {
        ...details({ description: 'NEW' }),
        is_lost: false,
      });
      expect(response.status).toBe(200);
    });

    it('keeps an existing inactive location but rejects choosing one', async () => {
      tickets.set(10, ticket({ location: 'OLD' }));
      const kept = await call('PATCH', '/10', {
        ...details({ location: 'OLD' }),
        is_lost: false,
      });
      expect(kept.status).toBe(200);
      const response = await call('PATCH', '/10', {
        ...details({ location: 'ZZ' }),
        is_lost: false,
      });
      expect(response.status).toBe(400);
      expect((await response.json()).field).toBe('location');
    });

    it('rejects a wrong PIN without saving', async () => {
      const response = await call('PATCH', '/10', {
        ...details({ employee_password: '0000', description: 'CHANGED' }),
        is_lost: false,
      });
      expect(response.status).toBe(400);
      expect((await response.json()).field).toBe('employee_password');
      expect(tickets.get(10)!.description).toBe('RING');
    });
  });

  describe('POST /tickets/:n/convert', () => {
    it('pawn → sell: 45-day term from now, no fee, sell count +1', async () => {
      const response = await call('POST', '/10/convert', {
        ...details(),
        target_status: 'sold',
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        status: 'sold',
        onetime_fee: 0,
        due_date: new Date(NOW.getTime() + 45 * DAY).toISOString(),
        transaction_datetime: PAWNED_AT.toISOString(),
      });
      expect(clients.get(1)!.sell_count).toBe(3);
    });

    it('sell → pawn: 30-day term from now, fee kept, sell count −1', async () => {
      tickets.set(10, ticket({ status: 'sold', onetime_fee: '0' }));
      const response = await call('POST', '/10/convert', {
        ...details({ onetime_fee: 7 }),
        target_status: 'pawned',
      });
      expect(await response.json()).toMatchObject({
        status: 'pawned',
        onetime_fee: 7,
        due_date: new Date(NOW.getTime() + 30 * DAY).toISOString(),
      });
      expect(clients.get(1)!.sell_count).toBe(1);
    });

    it.each([
      [
        'same status',
        {},
        { target_status: 'pawned' },
        409,
        'This ticket is already in the selected target status.',
      ],
      [
        'closed ticket',
        { status: 'sold_expired' },
        { target_status: 'pawned' },
        409,
        'Only pawned or sold tickets can be converted.',
      ],
      [
        '$0 sell',
        {},
        { target_status: 'sold', amount: 0 },
        400,
        'Amount must be greater than 0.',
      ],
    ])('rejects %s', async (_, ticketChange, body, status, message) => {
      tickets.set(10, ticket(ticketChange));
      await expectError(
        await call('POST', '/10/convert', { ...details(), ...body }),
        status,
        message,
      );
      expect(clients.get(1)!.sell_count).toBe(2);
    });

    it('rejects a deactivated client', async () => {
      clients.set(1, client({ is_active: false }));
      const response = await call('POST', '/10/convert', {
        ...details(),
        target_status: 'sold',
      });
      expect(response.status).toBe(409);
      expect(tickets.get(10)!.status).toBe('pawned');
    });
  });

  describe('transfer', () => {
    it('previews the ticket and its current owner', async () => {
      const response = await call('GET', '/10/transfer-preview');
      const body = await response.json();
      expect(body).toMatchObject({
        ticket_number: 10,
        amount: 100,
        previous_client_number: 1,
        previous_client_name: 'LEE, ANN',
      });
      expect(body).not.toHaveProperty('previous_client_is_active');
    });

    it('refuses a preview for a deactivated owner and 404s an unknown ticket', async () => {
      clients.set(1, client({ is_active: false }));
      expect((await call('GET', '/10/transfer-preview')).status).toBe(409);
      expect((await call('GET', '/99/transfer-preview')).status).toBe(404);
    });

    it('moves the ticket after locking both clients in number order', async () => {
      tickets.set(10, ticket({ client_number: 2 }));
      const response = await call('POST', '/10/transfer', { client_number: 1 });
      expect(response.status).toBe(200);
      expect((await response.json()).client_number).toBe(1);
      expect(clientLocks).toEqual([1, 2]);
    });

    it.each([
      [
        'the same owner',
        1,
        {},
        'This ticket already belongs to the selected client.',
      ],
      [
        'a closed ticket',
        2,
        { status: 'pawned_expired' },
        'Only pawned or sold tickets can be transferred.',
      ],
    ])('rejects %s', async (_, target, change, message) => {
      tickets.set(10, ticket(change));
      await expectError(
        await call('POST', '/10/transfer', { client_number: target }),
        409,
        message,
      );
    });

    it('rejects a deactivated target and a missing target', async () => {
      clients.set(2, client({ is_active: false }));
      expect(
        (await call('POST', '/10/transfer', { client_number: 2 })).status,
      ).toBe(409);
      expect(
        (await call('POST', '/10/transfer', { client_number: 77 })).status,
      ).toBe(404);
      expect(tickets.get(10)!.client_number).toBe(1);
    });
  });

  describe('POST /tickets/pickups', () => {
    // Pawned two days ago: early pickup = 100 + max(5, 10% = 10) + fee 5.
    it('charges the server amount when it matches the screen', async () => {
      const response = await call('POST', '/pickups', {
        tickets: [{ ticket_number: 10, amount: 115 }],
      });
      expect(response.status).toBe(200);
      const [picked] = await response.json();
      expect(picked).toMatchObject({
        status: 'pawned_picked_up',
        pickup_amount_paid: 115,
        pickup_allowed: false,
      });
      expect(clients.get(1)!.redeem_count).toBe(3);
    });

    it('rejects the whole batch when an amount differs from the screen', async () => {
      tickets.set(11, ticket({ ticket_number: 11 }));
      await expectError(
        await call('POST', '/pickups', {
          tickets: [
            { ticket_number: 10, amount: 115 },
            { ticket_number: 11, amount: 130 },
          ],
        }),
        409,
        'Ticket #11 amount is now $115.00 (the screen showed $130.00). Please review.',
      );
      expect(tickets.get(10)!.status).toBe('pawned');
    });

    it.each([
      ['missing', 99, {}, 404, 'Ticket #99 was not found.'],
      ['not pawned', 10, { status: 'sold' }, 409, 'Ticket #10 is not pawned.'],
      ['stolen', 10, { is_stolen: true }, 409, 'Ticket #10 is marked stolen.'],
    ])('rejects a %s ticket', async (_, number, change, status, message) => {
      tickets.set(10, ticket(change));
      await expectError(
        await call('POST', '/pickups', {
          tickets: [{ ticket_number: number, amount: 115 }],
        }),
        status,
        message,
      );
    });

    it.each([
      [{ tickets: [] }, 'Select at least one ticket.'],
      [
        {
          tickets: [
            { ticket_number: 10, amount: 1 },
            { ticket_number: 10, amount: 1 },
          ],
        },
        'Each ticket can be picked up only once.',
      ],
      [
        { tickets: [{ ticket_number: 10, amount: 'x' }] },
        'amount must be a number conforming to the specified constraints',
      ],
    ])('validates the batch %#', async (body, message) => {
      const response = await call('POST', '/pickups', body);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ field: 'tickets', message });
    });
  });

  describe('POST /tickets/extensions', () => {
    it('records interest and moves the due date by 30 days per month', async () => {
      const response = await call('POST', '/extensions', {
        extensions: [{ ticket_number: 10, months: 2, amount: 60 }],
      });
      expect(response.status).toBe(200);
      const [extended] = await response.json();
      expect(extended).toMatchObject({
        interest_paid_months: 2,
        due_date: new Date(FUTURE_DUE.getTime() + 60 * DAY).toISOString(),
        recorded_interest_amount_paid: 60,
      });
      expect(interestPayments).toEqual([[10, 2, 60, NOW]]);
    });

    it('rejects an interest amount the screen did not show', async () => {
      await expectError(
        await call('POST', '/extensions', {
          extensions: [{ ticket_number: 10, months: 1, amount: 25 }],
        }),
        409,
        'Ticket #10 amount is now $30.00 (the screen showed $25.00). Please review.',
      );
      expect(interestPayments).toEqual([]);
    });
  });

  describe('POST /tickets/:n/expire', () => {
    it.each([
      ['pawned', 'pawned_expired'],
      ['sold', 'sold_expired'],
    ])(
      'expires a past-due %s ticket without a PIN',
      async (status, expired) => {
        tickets.set(10, ticket({ status, due_date: PAST_DUE }));
        const response = await call('POST', '/10/expire');
        expect(response.status).toBe(200);
        expect((await response.json()).status).toBe(expired);
        expect(clients.get(1)!.expire_count).toBe(3);
      },
    );

    it('rejects a ticket that is not past due, or not open', async () => {
      await expectError(
        await call('POST', '/10/expire'),
        409,
        'Only tickets past the due date can be expired.',
      );
      tickets.set(
        10,
        ticket({ status: 'pawned_picked_up', due_date: PAST_DUE }),
      );
      await expectError(
        await call('POST', '/10/expire'),
        409,
        'Only pawned or sold tickets can be expired.',
      );
    });
  });

  describe('PATCH /tickets/:n/stolen', () => {
    it('marks stolen with a signed client note', async () => {
      const response = await call('PATCH', '/10/stolen', {
        is_stolen: true,
        employee_password: '1234',
      });
      expect((await response.json()).is_stolen).toBe(true);
      expect(clients.get(1)!.notes).toBe(
        'Regular Ticket #10 marked STOLEN (ANNA, 05-13-2026)',
      );
    });

    it('requires a PIN to mark stolen', async () => {
      const response = await call('PATCH', '/10/stolen', { is_stolen: true });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        field: 'employee_password',
        message: 'Enter employee password.',
      });
    });

    it.each([
      [
        'closed',
        { status: 'pawned_expired' },
        'Only pawned or sold tickets can be marked stolen.',
      ],
      [
        'already stolen',
        { is_stolen: true },
        'This ticket is already marked stolen.',
      ],
    ])('rejects marking a %s ticket', async (_, change, message) => {
      tickets.set(10, ticket(change));
      await expectError(
        await call('PATCH', '/10/stolen', {
          is_stolen: true,
          employee_password: '1234',
        }),
        409,
        message,
      );
      expect(clients.get(1)!.notes).toBe('Regular');
    });

    it('unmarks without a PIN or note, on any status', async () => {
      tickets.set(10, ticket({ is_stolen: true, status: 'pawned_expired' }));
      const response = await call('PATCH', '/10/stolen', { is_stolen: false });
      expect((await response.json()).is_stolen).toBe(false);
      expect(clients.get(1)!.notes).toBe('Regular');
      connection.query.mockClear();
      await expectError(
        await call('PATCH', '/10/stolen', { is_stolen: false }),
        409,
        'This ticket is not marked stolen.',
      );
    });
  });

  describe('POST /tickets/:n/reverse', () => {
    it('reopens a picked-up pawn, signs the note and lowers the redeem count', async () => {
      tickets.set(
        10,
        ticket({
          status: 'pawned_picked_up',
          pickup_datetime: NOW,
          pickup_amount_paid: '115.00',
        }),
      );
      const response = await call('POST', '/10/reverse', {
        employee_password: '1234',
      });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.previous_status).toBe('pawned_picked_up');
      expect(body.ticket).toMatchObject({
        status: 'pawned',
        pickup_amount_paid: null,
      });
      expect(body.client.notes).toBe(
        'Regular Ticket #10 pickup reversed (ANNA, 05-13-2026)',
      );
      expect(clients.get(1)!.redeem_count).toBe(1);
      expect(reversals).toEqual([
        { previous_status: 'pawned_picked_up', previous_amount: 115 },
      ]);
    });

    it('reverses an expiry and lowers the expire count', async () => {
      tickets.set(10, ticket({ status: 'pawned_expired', expire_date: NOW }));
      const body = await (
        await call('POST', '/10/reverse', { employee_password: '1234' })
      ).json();
      expect(body.client.notes).toContain('Ticket #10 expiry reversed');
      expect(clients.get(1)!.expire_count).toBe(1);
    });

    it.each([
      [
        'an open ticket',
        {},
        null,
        409,
        'Only expired or picked-up pawn tickets can be reversed.',
      ],
      [
        'an item held by a newer ticket',
        { status: 'pawned_picked_up' },
        { item_number: 5, ticket_number: 20 },
        409,
        'Item #5 is linked to a newer or active ticket #20.',
      ],
    ])('rejects %s', async (_, change, conflict, status, message) => {
      tickets.set(10, ticket(change));
      linkedConflict = conflict;
      await expectError(
        await call('POST', '/10/reverse', { employee_password: '1234' }),
        status,
        message,
      );
      expect(reversals).toEqual([]);
    });

    it('requires a valid PIN', async () => {
      tickets.set(10, ticket({ status: 'pawned_picked_up' }));
      const response = await call('POST', '/10/reverse', {
        employee_password: '0000',
      });
      expect(response.status).toBe(400);
      expect(tickets.get(10)!.status).toBe('pawned_picked_up');
      expect(clients.get(1)!.notes).toBe('Regular');
    });
  });
});
