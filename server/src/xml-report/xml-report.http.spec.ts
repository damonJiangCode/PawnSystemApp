import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Pool } from 'pg';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { LeadsOnlineClient } from './leadsonline.client.js';
import { XmlReportModule } from './xml-report.module.js';

const CREDENTIALS = {
  LEADSONLINE_STORE_ID: '123',
  LEADSONLINE_USERNAME: 'shop',
  LEADSONLINE_PASSWORD: 'secret',
};

// One item row of a ticket, as the source query returns it (made-up data).
const sourceRow = (overrides: Record<string, unknown> = {}) => ({
  ticket_number: 10,
  ticket_datetime: '2026-11-02 10:15',
  redeem_by_date: '2026-12-02',
  ticket_amount: '40.0',
  ticket_status: 'pawned',
  employee_name: 'SAM',
  client_number: 42,
  first_name: 'JANE',
  last_name: 'SAMPLE',
  middle_name: null,
  date_of_birth: '1990-01-02',
  gender: 'female',
  hair_color: 'BROWN',
  eye_color: 'BLUE',
  height_cm: '170.0',
  weight_kg: '60.0',
  address: '1 TEST STREET',
  city: 'SASKATOON',
  province: 'SK',
  postal_code: 'S7N0A0',
  phone: '3065550100',
  email: null,
  id_type: 'Passport',
  id_value: 'P1',
  item_number: 1,
  quantity: 1,
  category_name: 'Tools',
  description: 'DRILL',
  brand_name: 'ACME',
  model_number: null,
  serial_number: null,
  item_amount: '40.0',
  ...overrides,
});

const createApp = async (settings: Record<string, string>) => {
  const pool = { query: vi.fn(), connect: vi.fn() };
  const lockConnection = { query: vi.fn(), release: vi.fn() };
  const leadsOnline = { checkLogin: vi.fn(), submitTicket: vi.fn() };

  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => settings],
      }),
      XmlReportModule,
    ],
  })
    .overrideProvider(Pool)
    .useValue(pool)
    .overrideProvider(LeadsOnlineClient)
    .useValue(leadsOnline)
    .compile();
  const app: INestApplication = module.createNestApplication({
    logger: false,
  });
  await app.listen(0, '127.0.0.1');
  return {
    app,
    baseUrl: await app.getUrl(),
    pool,
    lockConnection,
    leadsOnline,
  };
};

describe('XmlReport HTTP (mock PostgreSQL and LeadsOnline)', () => {
  let ctx: Awaited<ReturnType<typeof createApp>>;
  let sourceRows: Record<string, unknown>[];
  let submissionRows: Record<string, unknown>[];

  beforeAll(async () => {
    ctx = await createApp(CREDENTIALS);
  });
  afterAll(async () => ctx?.app.close());

  beforeEach(() => {
    sourceRows = [];
    submissionRows = [];
    ctx.pool.query.mockReset().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM ticket t')) return { rows: sourceRows };
      if (sql.includes('FROM xml_report_submission'))
        return { rows: submissionRows };
      return { rows: [] };
    });
    ctx.lockConnection.query
      .mockReset()
      .mockImplementation(async (sql: string) =>
        sql.includes('pg_try_advisory_lock')
          ? { rows: [{ locked: true }] }
          : { rows: [] },
      );
    ctx.lockConnection.release.mockReset();
    ctx.pool.connect.mockReset().mockResolvedValue(ctx.lockConnection);
    ctx.leadsOnline.checkLogin.mockReset();
    ctx.leadsOnline.submitTicket.mockReset().mockResolvedValue({
      success: true,
      error_code: 0,
      message: 'Submitted successfully.',
    });
  });

  const preview = (query: string) =>
    fetch(`${ctx.baseUrl}/xml-reports/preview?${query}`);
  const submit = (body: unknown) =>
    fetch(`${ctx.baseUrl}/xml-reports/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const RANGE = { from_date: '2026-11-02', to_date: '2026-11-02' };
  const savedResults = () =>
    ctx.pool.query.mock.calls.filter(([sql]) =>
      String(sql).includes('INSERT INTO xml_report_submission'),
    );
  const lockCalls = () =>
    ctx.lockConnection.query.mock.calls.map(([sql]) => String(sql));

  it('reports the connection with the environment', async () => {
    ctx.leadsOnline.checkLogin.mockResolvedValue({
      success: false,
      error_code: 3,
      message: 'Invalid login',
    });

    const response = await fetch(`${ctx.baseUrl}/xml-reports/connection`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      environment: 'sandbox',
      connected: false,
      error_code: 3,
      message: 'Invalid login',
    });
  });

  it('previews tickets with problems and the last submission status', async () => {
    sourceRows = [
      sourceRow(),
      sourceRow({ item_number: 2, description: 'SAW' }),
      sourceRow({
        ticket_number: 11,
        id_value: null,
        brand_name: null,
        description: null,
      }),
    ];
    submissionRows = [
      { ticket_number: 10, status: 'failed', message: 'Bad postal code' },
    ];

    const response = await preview('from_date=2026-11-02&to_date=2026-11-02');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      from_date: '2026-11-02',
      total_tickets: 2,
      valid_tickets: 1,
      invalid_tickets: 1,
    });
    expect(body.tickets[0]).toMatchObject({
      payload: {
        key: { ticketnumber: '10', ticketDateTime: '2026-11-02 10:15' },
      },
      errors: [],
      submission_status: 'failed',
      submission_message: 'Bad postal code',
    });
    expect(body.tickets[0].payload.items.Item).toHaveLength(2);
    expect(body.tickets[1]).toMatchObject({
      errors: ['Item 1 has no identifying details.'],
      warnings: ['Customer ID is missing.'],
      submission_status: 'pending',
    });

    const [sourceSql, sourceValues] = ctx.pool.query.mock.calls[0];
    expect(sourceSql).toContain("AT TIME ZONE 'America/Regina'");
    expect(sourceValues).toEqual(['2026-11-02', '2026-11-02']);
    expect(ctx.pool.query.mock.calls[1][1]).toEqual(['sandbox', [10, 11]]);
  });

  it('rejects a bad range with the field', async () => {
    const response = await preview('from_date=2026-11-03&to_date=2026-11-02');

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      field: 'to_date',
      message: 'To date must be the same as or later than From date.',
    });
    expect(ctx.pool.query).not.toHaveBeenCalled();
  });

  it('submits pending tickets, skips submitted ones and records each result', async () => {
    sourceRows = [
      sourceRow(),
      sourceRow({ ticket_number: 11 }),
      sourceRow({ ticket_number: 12 }),
    ];
    submissionRows = [
      {
        ticket_number: 11,
        status: 'submitted',
        message: 'Submitted successfully.',
      },
    ];
    ctx.leadsOnline.submitTicket
      .mockResolvedValueOnce({ success: true, error_code: 0, message: 'OK' })
      .mockResolvedValueOnce({
        success: false,
        error_code: -1,
        message: 'Unable to reach LeadsOnline.',
      });

    const response = await submit(RANGE);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ...RANGE,
      results: [
        {
          ticket_number: 10,
          status: 'submitted',
          error_code: 0,
          message: 'OK',
        },
        {
          ticket_number: 11,
          status: 'skipped',
          error_code: 0,
          message: 'Already submitted.',
        },
        {
          ticket_number: 12,
          status: 'failed',
          error_code: -1,
          message: 'Unable to reach LeadsOnline.',
        },
      ],
      submitted_tickets: 1,
      failed_tickets: 1,
      skipped_tickets: 1,
    });
    expect(ctx.leadsOnline.submitTicket).toHaveBeenCalledTimes(2);
    expect(savedResults().map(([, values]) => values)).toEqual([
      [10, 'Pawn', '2026-11-02 10:15', 'sandbox', 'submitted', 0, 'OK'],
      [
        12,
        'Pawn',
        '2026-11-02 10:15',
        'sandbox',
        'failed',
        -1,
        'Unable to reach LeadsOnline.',
      ],
    ]);
    expect(lockCalls()).toEqual([
      'SELECT pg_try_advisory_lock($1) AS locked',
      'SELECT pg_advisory_unlock($1)',
    ]);
    expect(ctx.lockConnection.release).toHaveBeenCalledTimes(1);
  });

  it('answers 409 while another submit holds the lock', async () => {
    sourceRows = [sourceRow()];
    ctx.lockConnection.query.mockResolvedValue({ rows: [{ locked: false }] });

    const response = await submit(RANGE);

    expect(response.status).toBe(409);
    expect((await response.json()).message).toBe(
      'A LeadsOnline submission is already running. Wait for it to finish.',
    );
    expect(ctx.leadsOnline.submitTicket).not.toHaveBeenCalled();
    expect(lockCalls()).not.toContain('SELECT pg_advisory_unlock($1)');
    expect(ctx.lockConnection.release).toHaveBeenCalledTimes(1);
  });

  it('sends nothing while a ticket is invalid, and still unlocks', async () => {
    sourceRows = [
      sourceRow(),
      sourceRow({ ticket_number: 11, item_number: null }),
    ];

    const response = await submit(RANGE);

    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe(
      'Fix all invalid tickets before submitting the report.',
    );
    expect(ctx.leadsOnline.submitTicket).not.toHaveBeenCalled();
    expect(lockCalls()).toContain('SELECT pg_advisory_unlock($1)');
    expect(ctx.lockConnection.release).toHaveBeenCalledTimes(1);
  });

  it('answers 400 when the range has no tickets', async () => {
    const response = await submit(RANGE);

    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe(
      'There are no tickets to submit for this date range.',
    );
  });

  it('validates the submit body', async () => {
    const response = await submit({ from_date: '2026-11-02' });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ field: 'to_date' });
    expect(ctx.pool.connect).not.toHaveBeenCalled();
  });
});

describe('XmlReport HTTP without LeadsOnline credentials', () => {
  let ctx: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    ctx = await createApp({});
  });
  afterAll(async () => ctx?.app.close());
  afterEach(() => vi.clearAllMocks());

  it('answers 503 on submit before touching the database', async () => {
    const response = await fetch(`${ctx.baseUrl}/xml-reports/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from_date: '2026-11-02', to_date: '2026-11-02' }),
    });

    expect(response.status).toBe(503);
    expect((await response.json()).message).toBe(
      'LeadsOnline is not set up on the server. Check the LEADSONLINE_* settings.',
    );
    expect(ctx.pool.connect).not.toHaveBeenCalled();
  });

  it('still previews, so the tickets can be checked before setup', async () => {
    ctx.pool.query.mockResolvedValue({ rows: [] });

    const response = await fetch(
      `${ctx.baseUrl}/xml-reports/preview?from_date=2026-11-02&to_date=2026-11-02`,
    );

    expect(response.status).toBe(200);
    expect((await response.json()).total_tickets).toBe(0);
  });
});
