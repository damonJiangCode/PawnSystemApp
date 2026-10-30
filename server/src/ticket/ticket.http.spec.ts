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
import { ConfigModule } from '@nestjs/config';
import { TicketModule } from './ticket.module.js';

// Monday 23:30 in Regina (UTC-6) is already Tuesday in UTC.
const lateMondayPawn = new Date('2026-05-12T05:30:00Z');

const ticketRow = (overrides: Record<string, unknown> = {}) => ({
  ticket_number: 123,
  transaction_datetime: lateMondayPawn,
  is_lost: false,
  is_stolen: false,
  location: 'A1',
  description: 'RING',
  due_date: new Date('2026-06-11T05:30:00Z'),
  amount: '100.0',
  onetime_fee: '5.0',
  interest_paid_months: 1,
  interested_datetime: null,
  employee_name: 'ANNA',
  pickup_datetime: null,
  pickup_amount_paid: null,
  expire_date: null,
  status: 'pawned',
  status_updated_at: lateMondayPawn,
  client_number: 7,
  recorded_interest_amount_paid: '30.00',
  recorded_interest_months_paid: '1',
  ...overrides,
});

describe('Ticket HTTP lookups (mock PostgreSQL)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const pool = { query: vi.fn(), connect: vi.fn() };
  let tickets: Record<string, unknown>[];
  let clients: Record<string, unknown>[];
  let holidays: string[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        // Test-only config instead of the private .env.
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ EMPLOYEE_PIN_SECRET: 't'.repeat(32) })],
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
    // Wednesday noon in Regina: before the Thursday earliest pickup date.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-13T18:00:00Z'));
    tickets = [ticketRow()];
    clients = [{ client_number: 7, first_name: 'ann', last_name: 'lee' }];
    holidays = [];
    pool.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM holiday_date'))
        return {
          rows: holidays.map((holiday_date) => ({ holiday_date, name: 'H' })),
        };
      if (sql.includes('FROM ticket t')) return { rows: tickets };
      if (sql.includes('FROM client c')) return { rows: clients };
      return { rows: [] };
    });
  });

  const get = (path: string) => fetch(`${baseUrl}/tickets${path}`);
  const ticketCall = () =>
    pool.query.mock.calls.find(([sql]) =>
      String(sql).includes('FROM ticket t'),
    );

  it('lists a client’s tickets with numeric amounts and the legal pickup window', async () => {
    const response = await get('?client_number=7');
    expect(response.status).toBe(200);
    const [ticket] = await response.json();
    expect(ticket).toMatchObject({
      ticket_number: 123,
      amount: 100,
      onetime_fee: 5,
      recorded_interest_amount_paid: 30,
      recorded_interest_months_paid: 1,
      transaction_datetime: '2026-05-12T05:30:00.000Z',
      earliest_pickup_date: '2026-05-14',
      pickup_allowed: false,
    });
    expect(ticketCall()?.[1]).toEqual([7]);
    expect(ticketCall()?.[0]).toContain('WHERE t.client_number = $1');
  });

  it('allows pickup from the earliest date and skips holidays', async () => {
    vi.setSystemTime(new Date('2026-05-14T18:00:00Z'));
    let [ticket] = await (await get('?client_number=7')).json();
    expect(ticket.pickup_allowed).toBe(true);

    holidays = ['2026-05-13'];
    [ticket] = await (await get('?client_number=7')).json();
    expect(ticket.earliest_pickup_date).toBe('2026-05-15');
    expect(ticket.pickup_allowed).toBe(false);
  });

  it('still reports the hold on a ticket that was paid and picked up early', async () => {
    tickets = [
      ticketRow({ status: 'pawned_picked_up', pickup_amount_paid: '110.00' }),
    ];
    const [ticket] = await (await get('?client_number=7')).json();
    expect(ticket).toMatchObject({
      status: 'pawned_picked_up',
      pickup_amount_paid: 110,
      earliest_pickup_date: '2026-05-14',
      pickup_allowed: false,
    });
  });

  it.each([
    '',
    '?client_number=abc',
    '?client_number=0',
    '?client_number=7&x=1',
  ])('rejects an invalid list query (%s) with 400', async (query) => {
    expect((await get(query)).status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('finds a ticket with its client', async () => {
    const response = await get('/123');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ticket).toMatchObject({ ticket_number: 123, amount: 100 });
    expect(body.client).toMatchObject({ client_number: 7, first_name: 'ANN' });
    expect(ticketCall()?.[1]).toEqual([123]);
    const clientCall = pool.query.mock.calls.find(([sql]) =>
      String(sql).includes('FROM client c'),
    );
    expect(clientCall?.[1]).toEqual([7]);
  });

  it.each([
    ['ticket', () => (tickets = [])],
    ['client', () => (clients = [])],
  ])(
    'returns 404 with the ticket field when the %s is missing',
    async (_, arrange) => {
      arrange();
      const response = await get('/123');
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        field: 'ticket_number',
        message: 'No ticket was found for that ticket number.',
      });
    },
  );

  it.each(['/abc', '/0', '/2147483648'])(
    'rejects an invalid ticket number (%s) with 400',
    async (path) => {
      expect((await get(path)).status).toBe(400);
    },
  );
});
