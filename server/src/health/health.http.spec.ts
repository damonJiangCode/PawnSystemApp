import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { HealthModule } from './health.module.js';

describe('Health HTTP (mock PostgreSQL)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const pool = { query: vi.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [HealthModule] })
      .overrideProvider(Pool)
      .useValue(pool)
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });
  afterAll(async () => app?.close());
  afterEach(() => {
    pool.query.mockReset();
    vi.useRealTimers();
  });

  it('answers 200 when the database answers', async () => {
    pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(pool.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('answers 503 when the database fails', async () => {
    pool.query.mockRejectedValue(new Error('ECONNREFUSED'));

    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(503);
    expect((await response.json()).message).toBe(
      'The database is not reachable.',
    );
  });

  it('answers 503 when the database does not answer in time', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    pool.query.mockReturnValue(new Promise(() => {}));

    const pending = fetch(`${baseUrl}/health`);
    await vi.waitFor(() => expect(pool.query).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(3_000);

    expect((await pending).status).toBe(503);
  });
});
