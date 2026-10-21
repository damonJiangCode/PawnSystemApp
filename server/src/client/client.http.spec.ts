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
      redeem_count: 7,
    };
    connection.query.mockImplementation(
      async (sql: string, values: unknown[] = []) => {
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
});
