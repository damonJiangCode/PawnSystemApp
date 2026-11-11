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
import { ReportModule } from './report.module.js';

const row = (overrides: Record<string, unknown> = {}) => ({
  ticket_number: 10,
  ticket_amount: '100.0',
  ticket_description: 'RING',
  client_name: 'LEE, ANN',
  gender: 'female',
  eye_color: 'BROWN',
  identifications: 'Passport: P1',
  item_number: 1,
  quantity: 1,
  item_description: 'GOLD RING',
  brand_name: null,
  model_number: null,
  serial_number: null,
  item_amount: '100.0',
  ...overrides,
});

describe('Report HTTP (mock PostgreSQL)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const pool = { query: vi.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [ReportModule] })
      .overrideProvider(Pool)
      .useValue(pool)
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });
  afterAll(async () => app?.close());
  beforeEach(() => {
    pool.query.mockReset().mockResolvedValue({ rows: [] });
  });

  const daily = (query: string) => fetch(`${baseUrl}/reports/daily?${query}`);

  it('groups items under tickets and totals quantities and amounts', async () => {
    pool.query.mockResolvedValue({
      rows: [
        row(),
        row({ item_number: 2, quantity: 3, item_amount: '20.5' }),
        row({
          ticket_number: 11,
          ticket_amount: '50.5',
          item_number: null,
          quantity: null,
          item_amount: null,
        }),
      ],
    });

    const response = await daily('from_date=2026-11-01&to_date=2026-11-02');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      from_date: '2026-11-01',
      to_date: '2026-11-02',
      missing_item_ticket_numbers: [11],
      total_tickets: 2,
      total_items: 4,
      total_amount: 150.5,
    });
    expect(body.tickets[0]).toEqual({
      ticket_number: 10,
      amount: 100,
      description: 'RING',
      client_name: 'LEE, ANN',
      gender: 'female',
      eye_color: 'BROWN',
      identifications: 'Passport: P1',
      items: [
        {
          item_number: 1,
          quantity: 1,
          description: 'GOLD RING',
          brand_name: '',
          model_number: '',
          serial_number: '',
          amount: 100,
        },
        expect.objectContaining({ item_number: 2, quantity: 3, amount: 20.5 }),
      ],
    });
    expect(body.tickets[1].items).toEqual([]);
  });

  it('bounds the days in the shop time zone with SQL parameters', async () => {
    await daily('from_date=%202026-11-01%20&to_date=2026-11-01');

    const [sql, values] = pool.query.mock.calls[0];
    expect(values).toEqual(['2026-11-01', '2026-11-01']);
    expect(sql).toContain(
      "t.transaction_datetime >= ($1::date::timestamp AT TIME ZONE 'America/Regina')",
    );
    expect(sql).toContain(
      "t.transaction_datetime < (($2::date + 1)::timestamp AT TIME ZONE 'America/Regina')",
    );
  });

  it('accepts a range of up to one year', async () => {
    const response = await daily('from_date=2025-11-11&to_date=2026-11-10');
    expect(response.status).toBe(200);
  });

  it.each([
    ['', 'from_date', 'Enter a valid From date.'],
    ['from_date=2026-11-01', 'to_date', 'Enter a valid To date.'],
    [
      'from_date=11-01-2026&to_date=2026-11-01',
      'from_date',
      'Enter a valid From date.',
    ],
    [
      'from_date=2026-02-30&to_date=2026-03-01',
      'from_date',
      'Enter a valid From date.',
    ],
    [
      'from_date=2026-11-01&to_date=2026-13-01',
      'to_date',
      'Enter a valid To date.',
    ],
    [
      'from_date=2026-11-02&to_date=2026-11-01',
      'to_date',
      'To date must be the same as or later than From date.',
    ],
    [
      'from_date=2025-11-10&to_date=2026-11-10',
      'to_date',
      'Date range cannot exceed 1 year.',
    ],
    [
      'from_date=2026-11-01&to_date=2026-11-01&extra=1',
      'extra',
      'property extra should not exist',
    ],
  ])('rejects %s before SQL', async (query, field, message) => {
    const response = await daily(query);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ field, message });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('reports a database failure as 500 without its details', async () => {
    pool.query.mockRejectedValue(new Error('Private database error'));

    const response = await daily('from_date=2026-11-01&to_date=2026-11-01');

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('Private');
  });

  describe('GET /reports/buyback', () => {
    const buyback = (query: string) =>
      fetch(`${baseUrl}/reports/buyback?${query}`);

    it('lists picked-up tickets with numeric amounts and a rounded total', async () => {
      pool.query.mockResolvedValue({
        rows: [
          {
            ticket_number: 20,
            pickup_datetime: new Date('2026-11-02T01:00:00Z'),
            pickup_amount_paid: '130.10',
            description: 'WATCH',
            client_name: 'LEE, ANN',
          },
          {
            ticket_number: 21,
            pickup_datetime: new Date('2026-11-02T03:00:00Z'),
            pickup_amount_paid: '0.20',
            description: null,
            client_name: null,
          },
        ],
      });

      const response = await buyback('from_date=2026-11-01&to_date=2026-11-01');

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        from_date: '2026-11-01',
        to_date: '2026-11-01',
        rows: [
          {
            ticket_number: 20,
            pickup_datetime: '2026-11-02T01:00:00.000Z',
            pickup_amount_paid: 130.1,
            description: 'WATCH',
            client_name: 'LEE, ANN',
          },
          {
            ticket_number: 21,
            pickup_datetime: '2026-11-02T03:00:00.000Z',
            pickup_amount_paid: 0.2,
            description: '',
            client_name: '',
          },
        ],
        total_buyback_price: 130.3,
      });
    });

    it('filters picked-up tickets by pickup time in the shop time zone', async () => {
      await buyback('from_date=2026-11-01&to_date=2026-11-03');

      const [sql, values] = pool.query.mock.calls[0];
      expect(values).toEqual(['2026-11-01', '2026-11-03']);
      expect(sql).toContain("t.status = 'pawned_picked_up'");
      expect(sql).toContain(
        "t.pickup_datetime >= ($1::date::timestamp AT TIME ZONE 'America/Regina')",
      );
      expect(sql).toContain(
        "t.pickup_datetime < (($2::date + 1)::timestamp AT TIME ZONE 'America/Regina')",
      );
    });

    it.each([
      [
        'from_date=bad&to_date=2026-11-01',
        'from_date',
        'Enter a valid From date.',
      ],
      [
        'from_date=2026-11-02&to_date=2026-11-01',
        'to_date',
        'To date must be the same as or later than From date.',
      ],
      [
        'from_date=2025-11-10&to_date=2026-11-10',
        'to_date',
        'Date range cannot exceed 1 year.',
      ],
    ])('rejects %s before SQL', async (query, field, message) => {
      const response = await buyback(query);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ field, message });
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('GET /reports/interest', () => {
    const interest = (query: string) =>
      fetch(`${baseUrl}/reports/interest?${query}`);

    it('lists interest payments with numeric amounts and a rounded total', async () => {
      pool.query.mockImplementation(async (sql: string) =>
        sql.includes('MIN(payment_datetime)')
          ? { rows: [{ start_date: '2026-10-29' }] }
          : {
              rows: [
                {
                  ticket_number: 30,
                  months_paid: 2,
                  amount_paid: '60.10',
                  payment_datetime: new Date('2026-11-02T01:00:00Z'),
                  description: 'LAPTOP',
                  client_name: 'LEE, ANN',
                },
                {
                  ticket_number: 31,
                  months_paid: 1,
                  amount_paid: '0.20',
                  payment_datetime: new Date('2026-11-02T02:00:00Z'),
                  description: null,
                  client_name: null,
                },
              ],
            },
      );

      const response = await interest(
        'from_date=2026-11-01&to_date=2026-11-01',
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        from_date: '2026-11-01',
        to_date: '2026-11-01',
        records_start_date: '2026-10-29',
        rows: [
          {
            ticket_number: 30,
            months_paid: 2,
            amount_paid: 60.1,
            payment_datetime: '2026-11-02T01:00:00.000Z',
            description: 'LAPTOP',
            client_name: 'LEE, ANN',
          },
          {
            ticket_number: 31,
            months_paid: 1,
            amount_paid: 0.2,
            payment_datetime: '2026-11-02T02:00:00.000Z',
            description: '',
            client_name: '',
          },
        ],
        total_interest_paid: 60.3,
      });
    });

    it('filters payments by payment time in the shop time zone', async () => {
      await interest('from_date=2026-09-21&to_date=2026-09-30');

      const [sql, values] = pool.query.mock.calls.find(([text]) =>
        String(text).includes('FROM interest_payment ip'),
      )!;
      expect(values).toEqual(['2026-09-21', '2026-09-30']);
      expect(sql).toContain(
        "ip.payment_datetime >= ($1::date::timestamp AT TIME ZONE 'America/Regina')",
      );
      expect(sql).toContain(
        "ip.payment_datetime < (($2::date + 1)::timestamp AT TIME ZONE 'America/Regina')",
      );
    });

    it('returns an empty report with a null start date before any payment', async () => {
      const response = await interest(
        'from_date=2026-01-01&to_date=2026-01-31',
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        from_date: '2026-01-01',
        to_date: '2026-01-31',
        records_start_date: null,
        rows: [],
        total_interest_paid: 0,
      });
      const startSql = pool.query.mock.calls
        .map(([text]) => String(text))
        .find((text) => text.includes('MIN(payment_datetime)'));
      expect(startSql).toContain("AT TIME ZONE 'America/Regina'");
    });

    it.each([
      [
        'from_date=2026-11-02&to_date=2026-11-01',
        'to_date',
        'To date must be the same as or later than From date.',
      ],
      ['from_date=2026-11-01&to_date=bad', 'to_date', 'Enter a valid To date.'],
    ])('rejects %s before SQL', async (query, field, message) => {
      const response = await interest(query);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ field, message });
      expect(pool.query).not.toHaveBeenCalled();
    });
  });
});
