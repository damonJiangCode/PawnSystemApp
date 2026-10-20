import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientModule } from './client.module.js';

describe('Client HTTP search (database replaced with a mock)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const pool = { query: vi.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [ClientModule] })
      .overrideProvider(Pool).useValue(pool).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });
  beforeEach(() => { pool.query.mockReset(); });
  afterAll(async () => { await app?.close(); });

  it('returns complete mapped client data and IDs as JSON', async () => {
    pool.query.mockResolvedValue({ rows: [{
      client_number: 1, first_name: 'Damon', last_name: 'Wang',
      date_of_birth: new Date('1990-01-01T00:00:00Z'),
      updated_at: new Date('2026-10-19T00:00:00Z'),
      hold_until: '2026-10-20', image_path: 'images/clients/test.png',
      identifications: [{ id: 1, id_type: 'TEST', id_value: '123' }],
    }] });
    const response = await fetch(`${baseUrl}/client?firstName=%20Da%25%20&lastName=Wa`);
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

  it.each(['fristName=Da', `firstName=${'x'.repeat(21)}`, 'firstName=Da&firstName=Tom'])(
    'rejects invalid parameters before querying: %s', async query => {
      const response = await fetch(`${baseUrl}/client?${query}`);
      expect(response.status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    },
  );
  it('searches an exact leap-day DOB and returns mapped clients', async () => {
    pool.query.mockResolvedValue({ rows: [{
      client_number: 1, first_name: 'Damon',
      date_of_birth: new Date('2000-02-29T00:00:00Z'),
      identifications: [{ id: 1, id_type: 'TEST', id_value: '123' }],
    }] });
    const response = await fetch(`${baseUrl}/client/by-dob?dateOfBirth=%202000-02-29%20`);
    expect(response.status).toBe(200);
    const [client] = await response.json();
    expect(client.first_name).toBe('DAMON');
    expect(client.identifications).toHaveLength(1);
    expect(pool.query.mock.calls[0][0]).toContain('c.date_of_birth = $1::date');
    expect(pool.query.mock.calls[0][1]).toEqual(['2000-02-29']);
  });

  it('returns an empty array when DOB has no matches', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const response = await fetch(`${baseUrl}/client/by-dob?dateOfBirth=1990-01-01`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it.each([
    '', 'dateOfBirth=', 'dateOfBirth=2025-02-29',
    'dateOfBirth=2000-02-30', 'dateOfBirth=1990-13-01',
    'dateOfBirth=01-01-1990', 'dateOfBirth=1990-01-01T00:00:00Z',
    'dateOfBirth=1990-01-01&extra=x',
    'dateOfBirth=1990-01-01&dateOfBirth=1991-01-01',
  ])('rejects invalid DOB before querying: %s', async query => {
    const response = await fetch(`${baseUrl}/client/by-dob?${query}`);
    expect(response.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

});
