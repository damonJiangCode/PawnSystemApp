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
import { ClientModule } from './client.module.js';
import { ClientImageService } from './client-image.service.js';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const photo = {
  fileName: 'test.png',
  base64:
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVQAAAABJRU5ErkJggg==',
};

describe('Client HTTP search (database replaced with a mock)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let imageRoot: string;
  const connection = { query: vi.fn(), release: vi.fn() };
  const pool = { query: vi.fn(), connect: vi.fn() };

  beforeAll(async () => {
    imageRoot = await mkdtemp(path.join(tmpdir(), 'pawn-create-http-'));
    const module = await Test.createTestingModule({ imports: [ClientModule] })
      .overrideProvider(Pool)
      .useValue(pool)
      .overrideProvider(ClientImageService)
      .useValue(
        new ClientImageService(
          new ConfigService({ CLIENT_IMAGE_DIR: imageRoot }),
        ),
      )
      .compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });
  beforeEach(() => {
    pool.query.mockReset();
    pool.connect.mockReset().mockResolvedValue(connection);
    connection.query.mockReset();
    connection.release.mockReset();
  });
  afterAll(async () => {
    await app?.close();
    await rm(imageRoot, { recursive: true, force: true });
  });

  it('returns complete mapped client data and IDs as JSON', async () => {
    pool.query.mockResolvedValue({
      rows: [
        {
          client_number: 1,
          first_name: 'Damon',
          last_name: 'Wang',
          date_of_birth: new Date('1990-01-01T00:00:00Z'),
          updated_at: new Date('2026-10-19T00:00:00Z'),
          hold_until: '2026-10-20',
          image_path: 'images/clients/test.png',
          identifications: [{ id: 1, id_type: 'TEST', id_value: '123' }],
        },
      ],
    });
    const response = await fetch(
      `${baseUrl}/client?firstName=%20Da%25%20&lastName=Wa`,
    );
    expect(response.status).toBe(200);
    const [client] = await response.json();
    expect(client.first_name).toBe('DAMON');
    expect(client.date_of_birth).toBe('1990-01-01T00:00:00.000Z');
    expect(client.hold_until).toBe('2026-10-20');
    expect(client.image_path).toBe('images/clients/test.png');
    expect(client.identifications).toHaveLength(1);
    expect(pool.query.mock.calls[0][1]).toEqual(['Da!%', 'Wa']);
  });

  it('skips the database for whitespace-only input', async () => {
    const response = await fetch(`${baseUrl}/client?firstName=%20%20`);
    expect(await response.json()).toEqual([]);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it.each([
    'fristName=Da',
    `firstName=${'x'.repeat(21)}`,
    'firstName=Da&firstName=Tom',
  ])('rejects invalid parameters before querying: %s', async (query) => {
    const response = await fetch(`${baseUrl}/client?${query}`);
    expect(response.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });
  it('searches an exact leap-day DOB and returns mapped clients', async () => {
    pool.query.mockResolvedValue({
      rows: [
        {
          client_number: 1,
          first_name: 'Damon',
          date_of_birth: new Date('2000-02-29T00:00:00Z'),
          identifications: [{ id: 1, id_type: 'TEST', id_value: '123' }],
        },
      ],
    });
    const response = await fetch(
      `${baseUrl}/client/by-dob?dateOfBirth=%202000-02-29%20`,
    );
    expect(response.status).toBe(200);
    const [client] = await response.json();
    expect(client.first_name).toBe('DAMON');
    expect(client.identifications).toHaveLength(1);
    expect(pool.query.mock.calls[0][0]).toContain('c.date_of_birth = $1::date');
    expect(pool.query.mock.calls[0][1]).toEqual(['2000-02-29']);
  });

  it('returns an empty array when DOB has no matches', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const response = await fetch(
      `${baseUrl}/client/by-dob?dateOfBirth=1990-01-01`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it.each([
    '',
    'dateOfBirth=',
    'dateOfBirth=2025-02-29',
    'dateOfBirth=2000-02-30',
    'dateOfBirth=1990-13-01',
    'dateOfBirth=01-01-1990',
    'dateOfBirth=1990-01-01T00:00:00Z',
    'dateOfBirth=1990-01-01&extra=x',
    'dateOfBirth=1990-01-01&dateOfBirth=1991-01-01',
  ])('rejects invalid DOB before querying: %s', async (query) => {
    const response = await fetch(`${baseUrl}/client/by-dob?${query}`);
    expect(response.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  const validCreate = {
    client: {
      first_name: 'Damon',
      last_name: 'Wang',
      date_of_birth: '1990-01-01',
      gender: 'M',
      hair_color: 'BROWN',
      eye_color: 'BROWN',
      height_cm: 180,
      weight_kg: 81.65,
      address: 'Test address',
      city: 'Saskatoon',
      province: 'SK',
      country: 'Canada',
    },
    photo,
    identifications: [
      { id_type: 'TEST', id_value: '1' },
      { id_type: 'TEST', id_value: '2' },
    ],
  };

  it('creates client and IDs via POST and returns 201', async () => {
    connection.query.mockImplementation(
      async (sql: string, values: unknown[] = []) => {
        if (sql.includes('FROM id_type'))
          return { rows: [{ type: 'TEST', is_active: true }] };
        if (sql.includes('INSERT INTO client (')) {
          return {
            rows: [
              {
                ...validCreate.client,
                image_path: values[17],
                client_number: 1,
                redeem_count: 0,
                updated_at: new Date(),
              },
            ],
          };
        }
        if (sql.includes('INSERT INTO client_id')) {
          return {
            rows: [
              { id: 1, id_type: 'TEST', id_value: '1', updated_at: new Date() },
              { id: 2, id_type: 'TEST', id_value: '2', updated_at: new Date() },
            ],
          };
        }
        return { rows: [] };
      },
    );
    const response = await fetch(`${baseUrl}/client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validCreate),
    });
    expect(response.status).toBe(201);
    const client = await response.json();
    expect(client.first_name).toBe('DAMON');
    expect(client.identifications).toHaveLength(2);
    const idInserts = connection.query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO client_id'),
    );
    expect(idInserts).toHaveLength(1);
    expect(idInserts[0][1]).toEqual([1, 'TEST', '1', 'TEST', '2']);
    expect(client.redeem_count).toBe(0);
    expect(client.image_path).toMatch(/^images\/clients\/[0-9a-f-]+\.png$/);
    const image = await fetch(
      `${baseUrl}/client/images?${new URLSearchParams({ path: client.image_path })}`,
    );
    expect(image.status).toBe(200);
    expect(Buffer.from(await image.arrayBuffer())).toEqual(
      Buffer.from(photo.base64, 'base64'),
    );
    expect(connection.query).toHaveBeenCalledWith('COMMIT');
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it.each([
    { ...validCreate, photo: undefined },
    { ...validCreate, photo: { fileName: 'test.png' } },
    {
      ...validCreate,
      client: { ...validCreate.client, image_path: 'arbitrary.png' },
    },
    {
      ...validCreate,
      identifications: validCreate.identifications.slice(0, 1),
    },
    {
      ...validCreate,
      client: { ...validCreate.client, date_of_birth: '2025-02-29' },
    },
    { ...validCreate, client: { ...validCreate.client, first_name: ' ' } },
    { ...validCreate, client: { ...validCreate.client, height_cm: -1 } },
    { ...validCreate, client: { ...validCreate.client, redeem_count: 999 } },
    {
      ...validCreate,
      identifications: [
        { id_type: 'TEST', id_value: '' },
        validCreate.identifications[1],
      ],
    },
  ])(
    'rejects invalid create input before opening a connection',
    async (body) => {
      const response = await fetch(`${baseUrl}/client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
      expect(pool.connect).not.toHaveBeenCalled();
    },
  );
  it('rolls back and removes the submitted photo when inserting IDs fails', async () => {
    const before = await readdir(imageRoot);
    connection.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM id_type'))
        return { rows: [{ type: 'TEST', is_active: true }] };
      if (sql.includes('INSERT INTO client ('))
        return { rows: [{ ...validCreate.client, client_number: 1 }] };
      if (sql.includes('INSERT INTO client_id'))
        throw Object.assign(new Error('Invalid ID type'), { code: '23503' });
      return { rows: [] };
    });
    const response = await fetch(`${baseUrl}/client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validCreate),
    });
    expect(response.status).toBe(400);
    expect(connection.query).toHaveBeenCalledWith('ROLLBACK');
    expect(connection.release).toHaveBeenCalledOnce();
    expect(await readdir(imageRoot)).toEqual(before);
  });

  it('rejects invalid photo content without leaving a file', async () => {
    const before = await readdir(imageRoot);
    connection.query.mockResolvedValue({ rows: [] });
    const response = await fetch(`${baseUrl}/client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validCreate,
        photo: { fileName: 'bad.png', base64: 'not an image' },
      }),
    });
    expect(response.status).toBe(400);
    expect(await readdir(imageRoot)).toEqual(before);
  });

  function arrangeUpdate() {
    const stored: Record<string, unknown> = {
      ...validCreate.client,
      client_number: 42,
      phone: 'old-phone',
      image_path: 'images/clients/old.png',
      notes: 'Existing note',
      is_active: true,
      redeem_count: 7,
    };
    connection.query.mockImplementation(
      async (sql: string, values: unknown[] = []) => {
        if (sql.includes('FROM id_type'))
          return { rows: [{ type: 'TEST', is_active: true }] };
        if (sql.includes('FROM employee'))
          return {
            rows:
              values[0] === 'valid-code'
                ? [{ employee_number: 7, first_name: 'STAFF' }]
                : [],
          };
        if (sql.includes('FOR UPDATE')) return { rows: [{ ...stored }] };
        if (sql.startsWith('UPDATE client')) {
          for (const match of sql.matchAll(/(\w+) = \$(\d+)/g)) {
            if (match[1] !== 'client_number')
              stored[match[1]] = values[Number(match[2]) - 1];
          }
          return { rows: [{ ...stored }] };
        }
        if (sql.startsWith('SELECT id,'))
          return { rows: [{ id: 1, id_type: 'TEST', id_value: 'original' }] };
        return { rows: [] };
      },
    );
    return stored;
  }

  function patch(body: unknown, number = '42') {
    return fetch(`${baseUrl}/client/${number}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('deactivates and reactivates with signed history, keeping existing ticket data', async () => {
    const stored = arrangeUpdate();
    for (const [is_active, action] of [
      [false, 'Deactivated'],
      [true, 'Reactivated'],
    ] as const) {
      const response = await patch({
        client: { is_active },
        employee_password: 'valid-code',
      });
      expect(response.status).toBe(200);
      const client = await response.json();
      expect(client.is_active).toBe(is_active);
      expect(client.notes).toContain('Existing note');
      expect(client.notes).toMatch(
        new RegExp(`${action} client \\(STAFF, \\d{2}-\\d{2}-\\d{4}\\)`),
      );
      expect(client.redeem_count).toBe(7);
      expect(client.identifications).toHaveLength(1);
    }
    expect(stored.notes).toContain('Deactivated client');
    expect(stored.notes).toContain('Reactivated client');
  });

  it.each([undefined, 'wrong'])(
    'rejects status changes without a valid employee (%s)',
    async (employee_password) => {
      const stored = arrangeUpdate();
      const response = await patch({
        client: { is_active: false },
        employee_password,
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        field: 'employee_password',
      });
      expect(stored.is_active).toBe(true);
      expect(stored.notes).toBe('Existing note');
      expect(
        connection.query.mock.calls.some(([sql]) =>
          sql.startsWith('UPDATE client'),
        ),
      ).toBe(false);
    },
  );

  it('does not require a password or duplicate signatures for an unchanged status', async () => {
    arrangeUpdate();
    const response = await patch({ client: { is_active: true, phone: '123' } });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      is_active: true,
      phone: '123',
      notes: 'Existing note',
    });
    expect(
      connection.query.mock.calls.some(([sql]) =>
        sql.includes('FROM employee'),
      ),
    ).toBe(false);
  });

  it('signs edited notes and appends the status entry in the same PATCH', async () => {
    arrangeUpdate();
    const response = await patch({
      client: { is_active: false, notes: 'Updated note' },
      employee_password: 'valid-code',
      notes_action: 'append_signature',
    });
    expect(response.status).toBe(200);
    expect((await response.json()).notes).toMatch(
      /^Updated note \(STAFF, .*\) Deactivated client \(STAFF, \d{2}-\d{2}-\d{4}\)$/,
    );
  });

  it('appends a signed hold entry on every submission, including the same date', async () => {
    const stored = arrangeUpdate();
    for (let count = 1; count <= 2; count++) {
      const response = await patch({
        client: { hold_until: '2026-11-15' },
        employee_password: 'valid-code',
      });
      expect(response.status).toBe(200);
      const client = await response.json();
      expect(client.hold_until).toBe('2026-11-15');
      expect(client.notes.startsWith('Existing note ')).toBe(true);
      expect(
        client.notes.match(
          /Hold till 11-15-2026 \(STAFF, \d{2}-\d{2}-\d{4}\)/g,
        ),
      ).toHaveLength(count);
      expect(client.identifications).toHaveLength(1);
    }
    expect(stored.hold_until).toBe('2026-11-15');
  });

  it('clears a hold without employee checks and preserves historical notes', async () => {
    const stored = arrangeUpdate();
    stored.hold_until = '2026-11-15';
    stored.notes = 'Existing note\nHold till 2026-11-15 (STAFF, 2026-10-22)';
    const response = await patch({ client: { hold_until: null } });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      hold_until: null,
      notes: stored.notes,
    });
    expect(
      connection.query.mock.calls.some(([sql]) =>
        sql.includes('FROM employee'),
      ),
    ).toBe(false);
  });

  it('returns 404 when the hold client does not exist', async () => {
    connection.query.mockResolvedValue({ rows: [] });
    const response = await patch({ client: { hold_until: null } });
    expect(response.status).toBe(404);
    expect(connection.query).toHaveBeenCalledWith('ROLLBACK');
    expect(
      connection.query.mock.calls.some(([sql]) =>
        sql.startsWith('UPDATE client'),
      ),
    ).toBe(false);
  });

  it.each([undefined, 'wrong'])(
    'requires a valid employee to set a hold (%s)',
    async (password) => {
      const stored = arrangeUpdate();
      const response = await patch({
        client: { hold_until: '2026-11-15' },
        employee_password: password,
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        field: 'employee_password',
      });
      expect(stored.notes).toBe('Existing note');
      expect(
        connection.query.mock.calls.some(([sql]) =>
          sql.startsWith('UPDATE client'),
        ),
      ).toBe(false);
    },
  );

  it.each([
    '2026-02-30',
    '2026-2-01',
    '',
    '2026-11-15T00:00:00Z',
    '0999-01-01',
    123,
  ])('rejects invalid hold dates before connecting: %s', async (hold_until) => {
    const response = await patch({
      client: { hold_until },
      employee_password: 'valid-code',
    });
    expect(response.status).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('accepts a partial PATCH without requiring unchanged fields', async () => {
    arrangeUpdate();
    const response = await patch({ client: { phone: 'new-phone' } });
    expect(response.status).toBe(200);
    const client = await response.json();
    expect(client.phone).toBe('new-phone');
    expect(client.redeem_count).toBe(7);
    expect(client.image_path).toBe('images/clients/old.png');
    expect(client.identifications).toHaveLength(1);
    expect(
      connection.query.mock.calls.some(([sql]) =>
        sql.includes('DELETE FROM client_id'),
      ),
    ).toBe(false);
  });

  it('returns a field error for wrong passwords before file or record writes', async () => {
    arrangeUpdate();
    const files = await readdir(imageRoot);
    const response = await patch({
      client: { notes: 'New note' },
      notes_action: 'append_signature',
      employee_password: 'wrong',
      photo,
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ field: 'employee_password' });
    expect(await readdir(imageRoot)).toEqual(files);
    expect(
      connection.query.mock.calls.some(([sql]) =>
        /UPDATE client|INSERT INTO client_id|DELETE FROM client_id/.test(sql),
      ),
    ).toBe(false);
  });

  it('signs notes after verifying the employee in the same PATCH request', async () => {
    arrangeUpdate();
    const response = await patch({
      client: { notes: 'New note' },
      notes_action: 'append_signature',
      employee_password: 'valid-code',
    });
    expect(response.status).toBe(200);
    expect((await response.json()).notes).toMatch(
      /^New note \(STAFF, \d{4}-\d{2}-\d{2}\)$/,
    );
  });

  it('replaces a photo in the PATCH request and leaves previous files intact', async () => {
    arrangeUpdate();
    const files = await readdir(imageRoot);
    const response = await patch({ photo });
    expect(response.status).toBe(200);
    const client = await response.json();
    expect(client.image_path).not.toBe('images/clients/old.png');
    expect(await readdir(imageRoot)).toHaveLength(files.length + 1);
    for (const file of files) expect(await readdir(imageRoot)).toContain(file);
  });

  it.each([
    {},
    { client: {} },
    { client: null },
    { client: { first_name: '' } },
    { client: { date_of_birth: '2025-02-29' } },
    { client: { date_of_birth: null } },
    { client: { phone: null } },
    { client: { is_active: null } },
    { client: { is_active: 'false' } },
    { client: { redeem_count: 999 } },
    { identifications: [] },
    { identifications: null },
    {
      identifications: [
        { id_type: 'TEST' },
        { id_type: 'TEST', id_value: '2' },
      ],
    },
    { photo: null },
    { photo: { fileName: 'test.png' } },
  ])('rejects invalid PATCH fields without connecting', async (body) => {
    const response = await patch(body);
    expect(response.status).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it.each(['0', '-1', 'not-a-number', '9007199254740992'])(
    'rejects invalid PATCH client number %s',
    async (number) => {
      const response = await patch({ client: { phone: '123' } }, number);
      expect(response.status).toBe(400);
      expect(pool.connect).not.toHaveBeenCalled();
    },
  );
  it('rejects an inactive ID type on create before creating any image file', async () => {
    const before = await readdir(imageRoot);
    connection.query.mockImplementation(async (sql: string) => ({
      rows: sql.includes('FROM id_type')
        ? [{ type: 'TEST', is_active: false }]
        : [],
    }));
    const response = await fetch(`${baseUrl}/client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validCreate),
    });
    expect(response.status).toBe(400);
    expect((await response.json()).field).toBe('identifications');
    expect(
      connection.query.mock.calls.some(([sql]) => sql.startsWith('INSERT')),
    ).toBe(false);
    expect(await readdir(imageRoot)).toEqual(before);
  });

  it('keeps an existing inactive ID through PATCH, but rejects changing its number', async () => {
    arrangeUpdate();
    const previous = connection.query.getMockImplementation()!;
    const ids = [
      { id_type: 'TEST', id_value: 'original' },
      { id_type: 'ACTIVE', id_value: 'new' },
    ];
    connection.query.mockImplementation(
      async (sql: string, values: unknown[] = []) => {
        if (sql.includes('FROM id_type'))
          return {
            rows: [
              { type: 'TEST', is_active: false },
              { type: 'ACTIVE', is_active: true },
            ],
          };
        if (sql.includes('INSERT INTO client_id'))
          return { rows: ids.map((id, i) => ({ ...id, id: i + 1 })) };
        return previous(sql, values);
      },
    );
    let response = await patch({ identifications: ids });
    expect(response.status).toBe(200);
    expect((await response.json()).identifications).toHaveLength(2);
    connection.query.mockClear();
    response = await patch({
      identifications: [{ ...ids[0], id_value: 'changed' }, ids[1]],
    });
    expect(response.status).toBe(400);
    expect(
      connection.query.mock.calls.some(
        ([sql]) => sql.startsWith('UPDATE') || sql.startsWith('DELETE'),
      ),
    ).toBe(false);
    expect(connection.query).toHaveBeenCalledWith('ROLLBACK');
  });
});
