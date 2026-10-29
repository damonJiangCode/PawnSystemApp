import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { EmployeePinHasher } from './employee-pin.hasher.js';
import { EmployeeModule } from './employee.module.js';

const pins = new EmployeePinHasher(
  new ConfigService({ EMPLOYEE_PIN_SECRET: 'p'.repeat(32) }),
);
const MANAGER_PIN = 'boss';

const employee = {
  employee_number: 5,
  first_name: 'ANNA',
  last_name: 'LEE',
  nickname: 'AL',
  date_of_birth: '1990-04-02',
  gender: 'female',
  is_terminated: false,
  is_manager: false,
  address: '',
  phone: '',
  email: '',
  created_at: '2026-10-28T00:00:00.000Z',
  updated_at: '2026-10-28T00:00:00.000Z',
};

const body = (overrides: Record<string, unknown> = {}) => ({
  first_name: ' anna ',
  last_name: 'lee',
  nickname: 'al',
  date_of_birth: '1990-04-02',
  gender: 'female',
  is_terminated: false,
  is_manager: false,
  manager_password: MANAGER_PIN,
  ...overrides,
});

describe('Employee HTTP (mock PostgreSQL)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const connection = { query: vi.fn(), release: vi.fn() };
  const pool = { query: vi.fn(), connect: vi.fn() };
  let activeManagers: number[];
  let writeError: unknown;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EmployeeModule],
    })
      .overrideProvider(Pool)
      .useValue(pool)
      .overrideProvider(EmployeePinHasher)
      .useValue(pins)
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });
  afterAll(async () => app?.close());
  beforeEach(() => {
    vi.resetAllMocks();
    activeManagers = [1];
    writeError = undefined;
    pool.connect.mockResolvedValue(connection);
    connection.query.mockImplementation(
      async (sql: string, values: unknown[] = []) => {
        if (sql.includes('pin_hash = $1 AND is_manager'))
          return {
            rows:
              values[0] === pins.hash(MANAGER_PIN)
                ? [{ employee_number: 1 }]
                : [],
          };
        if (sql.includes('ORDER BY employee_number FOR UPDATE'))
          return {
            rows: activeManagers.map((employee_number) => ({
              employee_number,
            })),
          };
        if (sql.includes('WHERE employee_number = $1 FOR UPDATE'))
          return {
            rows:
              values[0] === 5 || activeManagers.includes(values[0] as number)
                ? [{ ...employee, employee_number: values[0] }]
                : [],
          };
        if (sql.startsWith('INSERT') || sql.startsWith('UPDATE')) {
          if (writeError) throw writeError;
          return { rows: [employee] };
        }
        return { rows: [] };
      },
    );
  });

  const request = (path: string, method = 'GET', payload?: unknown) =>
    fetch(`${baseUrl}/employees${path}`, {
      method,
      ...(payload === undefined
        ? {}
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
    });
  const sqlCalls = () =>
    connection.query.mock.calls.map(([sql]) => String(sql).split(/\s+/)[0]);
  const writeValues = () =>
    connection.query.mock.calls.find(([sql]) =>
      /^(INSERT|UPDATE)/.test(String(sql)),
    )?.[1] as unknown[];
  const pinConflict = { code: '23505', constraint: 'employee_pin_hash_key' };

  describe('GET /employees', () => {
    it('searches by escaped partial names', async () => {
      pool.query.mockResolvedValue({ rows: [employee] });
      const response = await request('?first_name=%20an%25&last_name=l_e');
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([employee]);
      expect(pool.query.mock.calls[0][1]).toEqual(['an!%', 'l!_e']);
      expect(pool.query.mock.calls[0][0]).not.toContain('pin_hash');
    });

    it('lists everyone without filters and rejects unknown query fields', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      expect((await request('')).status).toBe(200);
      expect(pool.query.mock.calls[0][1]).toEqual(['', '']);
      expect((await request('?pin=1')).status).toBe(400);
    });
  });

  describe('POST /employees', () => {
    it('creates with normalized details and stores only the PIN hash', async () => {
      const response = await request(
        '',
        'POST',
        body({ password: ' 4321 ', email: ' a@b.c ' }),
      );
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual(employee);
      const values = writeValues();
      expect(values.slice(0, 3)).toEqual(['ANNA', 'LEE', 'AL']);
      expect(values).toContain('a@b.c');
      expect(values.at(-1)).toBe(pins.hash('4321'));
      expect(values).not.toContain('4321');
      expect(sqlCalls()).toEqual(['BEGIN', 'SELECT', 'INSERT', 'COMMIT']);
      expect(connection.release).toHaveBeenCalledOnce();
    });

    it('rejects a wrong manager password with 403 and writes nothing', async () => {
      const response = await request(
        '',
        'POST',
        body({ password: '4321', manager_password: 'nope' }),
      );
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        field: 'manager_password',
        message: 'Manager password is incorrect.',
      });
      expect(sqlCalls()).toEqual(['BEGIN', 'SELECT', 'ROLLBACK']);
      expect(connection.release).toHaveBeenCalledOnce();
    });

    it('maps the unique PIN constraint to 409 on password', async () => {
      writeError = pinConflict;
      const response = await request('', 'POST', body({ password: '4321' }));
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        field: 'password',
        message: 'Password is already in use.',
      });
      expect(sqlCalls().at(-1)).toBe('ROLLBACK');
    });

    it.each([
      ['missing password', body()],
      [
        'blank manager password',
        body({ password: '1', manager_password: ' ' }),
      ],
      ['impossible date', body({ password: '1', date_of_birth: '1990-02-30' })],
      [
        'wrong date format',
        body({ password: '1', date_of_birth: '04/02/1990' }),
      ],
      ['unknown gender', body({ password: '1', gender: 'other' })],
      ['unknown field', body({ password: '1', pin_hash: 'x' })],
      ['non-boolean flag', body({ password: '1', is_manager: 'yes' })],
    ])(
      'rejects %s with 400 before touching the database',
      async (_, payload) => {
        const response = await request('', 'POST', payload);
        expect(response.status).toBe(400);
        expect(pool.connect).not.toHaveBeenCalled();
      },
    );
  });

  describe('PUT /employees/:employeeNumber', () => {
    it('keeps the PIN when password is omitted and locks managers first', async () => {
      const response = await request('/5', 'PUT', body());
      expect(response.status).toBe(200);
      expect(writeValues()[0]).toBe(5);
      expect(writeValues().at(-1)).toBeNull();
      const sql = connection.query.mock.calls.map(([text]) => String(text));
      expect(
        sql.findIndex((text) =>
          text.includes('ORDER BY employee_number FOR UPDATE'),
        ),
      ).toBeLessThan(
        sql.findIndex((text) =>
          text.includes('WHERE employee_number = $1 FOR UPDATE'),
        ),
      );
      expect(sqlCalls().at(-1)).toBe('COMMIT');
    });

    it('hashes a new PIN and maps a PIN conflict to 409', async () => {
      writeError = pinConflict;
      const response = await request('/5', 'PUT', body({ password: '777' }));
      expect(response.status).toBe(409);
      expect(writeValues().at(-1)).toBe(pins.hash('777'));
    });

    it('returns 404 for an unknown employee', async () => {
      const response = await request('/404', 'PUT', body());
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        field: 'form',
        message: 'No employee was found for that number.',
      });
    });

    it.each([
      ['demoting', { is_manager: false }],
      ['terminating', { is_manager: true, is_terminated: true }],
    ])('blocks %s the last active manager with 409', async (_, change) => {
      const response = await request('/1', 'PUT', body(change));
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        field: 'form',
        message: 'At least one active manager is required.',
      });
      expect(writeValues()).toBeUndefined();
      expect(sqlCalls().at(-1)).toBe('ROLLBACK');
    });

    it('allows demoting a manager when another active manager remains', async () => {
      activeManagers = [1, 2];
      const response = await request('/2', 'PUT', body({ is_manager: false }));
      expect(response.status).toBe(200);
    });

    it.each([
      ['blank password', '/5', body({ password: '  ' })],
      ['non-numeric number', '/abc', body()],
      ['zero', '/0', body()],
    ])('rejects %s with 400', async (_, path, payload) => {
      const response = await request(path, 'PUT', payload);
      expect(response.status).toBe(400);
      expect(pool.connect).not.toHaveBeenCalled();
    });
  });
});
