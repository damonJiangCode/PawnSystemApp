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

const SECRET = 'i'.repeat(32);
const pins = new EmployeePinHasher(
  new ConfigService({ EMPLOYEE_PIN_SECRET: SECRET }),
);
const NOW = new Date('2026-05-13T18:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

const pawnBody = (overrides: Record<string, unknown> = {}) => ({
  client_number: 7,
  description: '  gold ring ',
  location: ' a1 ',
  amount: 100.5,
  onetime_fee: 5,
  employee_password: ' 1234 ',
  ...overrides,
});
const sellBody = (overrides: Record<string, unknown> = {}) => {
  const { onetime_fee: _fee, ...body } = pawnBody(overrides);
  return body;
};

describe('Ticket issuing HTTP: pawn and sell (mock PostgreSQL)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const pool = { query: vi.fn(), connect: vi.fn() };
  const connection = { query: vi.fn(), release: vi.fn() };
  let client: { is_active: boolean } | null;
  let locationActive: boolean | null;
  let employee: { first_name: string; nickname: string } | null;

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
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    client = { is_active: true };
    locationActive = true;
    employee = { first_name: 'ANNA', nickname: 'AL' };
    pool.connect.mockResolvedValue(connection);
    pool.query.mockResolvedValue({ rows: [] });
    let inserted: unknown[] = [];
    connection.query.mockImplementation(
      async (sql: string, values: unknown[] = []) => {
        if (sql.includes('FROM client WHERE client_number = $1 FOR UPDATE'))
          return { rows: client ? [client] : [] };
        if (sql.includes('FROM location'))
          return {
            rows:
              locationActive === null ? [] : [{ is_active: locationActive }],
          };
        if (sql.includes('FROM employee'))
          return {
            rows: employee && values[0] === pins.hash('1234') ? [employee] : [],
          };
        if (sql.startsWith('INSERT INTO ticket')) {
          inserted = values;
          return { rows: [{ ticket_number: 555 }] };
        }
        if (sql.includes('FROM ticket t'))
          return {
            rows: [
              {
                ticket_number: 555,
                transaction_datetime: inserted[0],
                location: inserted[1],
                description: inserted[2],
                due_date: inserted[3],
                amount: String(inserted[4]),
                onetime_fee: String(inserted[5]),
                employee_name: inserted[6],
                status: inserted[7],
                client_number: inserted[8],
                is_lost: false,
                is_stolen: false,
                interest_paid_months: 0,
                status_updated_at: inserted[0],
              },
            ],
          };
        return { rows: [] };
      },
    );
  });

  const post = (kind: 'pawn' | 'sell', body: unknown) =>
    fetch(`${baseUrl}/tickets/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const statements = () =>
    connection.query.mock.calls.map(
      ([sql]) => String(sql).trim().split(/\s+/)[0],
    );
  const insertValues = () =>
    connection.query.mock.calls.find(([sql]) =>
      String(sql).startsWith('INSERT INTO ticket'),
    )?.[1] as unknown[] | undefined;
  const sellCountUpdates = () =>
    connection.query.mock.calls.filter(([sql]) =>
      String(sql).includes('sell_count'),
    );

  it('pawns with server dates, normalized input and the employee nickname', async () => {
    const response = await post('pawn', pawnBody());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ticket_number: 555,
      status: 'pawned',
      amount: 100.5,
      onetime_fee: 5,
      location: 'A1',
      description: 'gold ring',
      employee_name: 'AL',
      transaction_datetime: NOW.toISOString(),
      due_date: new Date(NOW.getTime() + 30 * DAY).toISOString(),
      // Wednesday pawn: Thu and Fri are the hold days, release on Saturday.
      earliest_pickup_date: '2026-05-16',
      pickup_allowed: false,
    });
    expect(insertValues()).not.toContain(' 1234 ');
    expect(sellCountUpdates()).toHaveLength(0);
    expect(statements()).toEqual([
      'BEGIN',
      'SELECT', // lock client
      'SELECT', // location
      'SELECT', // employee PIN
      'INSERT',
      'SELECT', // reload
      'COMMIT',
    ]);
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('allows a $0 pawn for signature-only records', async () => {
    const response = await post('pawn', pawnBody({ amount: 0 }));
    expect(response.status).toBe(201);
    expect(insertValues()?.[4]).toBe(0);
  });

  it('records the first name when the nickname is blank', async () => {
    employee = { first_name: 'ANNA', nickname: ' ' };
    await post('pawn', pawnBody());
    expect(insertValues()?.[6]).toBe('ANNA');
  });

  it('sells with a 45-day term, no fee, and increments the sell count', async () => {
    const response = await post('sell', sellBody());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      status: 'sold',
      onetime_fee: 0,
      due_date: new Date(NOW.getTime() + 45 * DAY).toISOString(),
    });
    expect(sellCountUpdates()).toHaveLength(1);
    expect(sellCountUpdates()[0][1]).toEqual([7, 1]);
    expect(statements().at(-1)).toBe('COMMIT');
  });

  it.each([
    ['pawn', pawnBody({ amount: -1 }), 'amount', 'Amount cannot be negative.'],
    [
      'pawn',
      pawnBody({ amount: 12.34 }),
      'amount',
      'Amount must be a number with at most one decimal place.',
    ],
    [
      'pawn',
      pawnBody({ amount: 'abc' }),
      'amount',
      'Amount must be a number with at most one decimal place.',
    ],
    [
      'pawn',
      pawnBody({ onetime_fee: 1.25 }),
      'onetime_fee',
      'One Time Fee must be a number with at most one decimal place.',
    ],
    [
      'pawn',
      pawnBody({ description: '   ' }),
      'description',
      'Description is required.',
    ],
    ['pawn', pawnBody({ location: '' }), 'location', 'Location is required.'],
    [
      'pawn',
      pawnBody({ employee_password: ' ' }),
      'employee_password',
      'Enter employee password.',
    ],
    [
      'sell',
      sellBody({ amount: 0 }),
      'amount',
      'Amount must be greater than 0.',
    ],
    [
      'sell',
      pawnBody(),
      'onetime_fee',
      'property onetime_fee should not exist',
    ],
  ])(
    '%s rejects invalid %j field before the database',
    async (kind, body, field, message) => {
      const response = await post(kind as 'pawn' | 'sell', body);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ field, message });
      expect(pool.connect).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['missing client', () => (client = null), 404, 'Client not found.'],
    [
      'deactivated client',
      () => (client = { is_active: false }),
      409,
      'Deactivated clients cannot issue, convert or transfer tickets. Reactivate the client first.',
    ],
  ])('rolls back for a %s', async (_, arrange, status, message) => {
    arrange();
    const response = await post('pawn', pawnBody());
    expect(response.status).toBe(status);
    expect((await response.json()).message).toBe(message);
    expect(insertValues()).toBeUndefined();
    expect(statements().at(-1)).toBe('ROLLBACK');
  });

  it.each([
    ['inactive', false],
    ['unknown', null],
  ])('rejects an %s location with the location field', async (_, active) => {
    locationActive = active;
    const response = await post('sell', sellBody());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      field: 'location',
      message: 'Select a valid location from the list.',
    });
    expect(insertValues()).toBeUndefined();
  });

  it('rejects a wrong employee PIN and writes nothing', async () => {
    const response = await post(
      'pawn',
      pawnBody({ employee_password: '9999' }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      field: 'employee_password',
      message: 'Employee password is incorrect.',
    });
    expect(insertValues()).toBeUndefined();
    expect(sellCountUpdates()).toHaveLength(0);
    expect(statements().at(-1)).toBe('ROLLBACK');
  });
});
