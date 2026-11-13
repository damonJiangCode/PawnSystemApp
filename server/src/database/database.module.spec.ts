import type { FactoryProvider } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Pool, types } from 'pg';
import { describe, expect, it } from 'vitest';
import { DatabaseModule, pgTypes } from './database.module.js';

describe('DatabaseModule', () => {
  it('parses DATE columns as YYYY-MM-DD strings for this pool only', () => {
    expect(pgTypes.getTypeParser(1082, 'text')('1990-01-01')).toBe(
      '1990-01-01',
    );
    // Other types keep pg's parsing, and the global default is untouched.
    expect(pgTypes.getTypeParser(23, 'text')('42')).toBe(42);
    expect(types.getTypeParser(1082, 'text')('1990-01-01')).toBeInstanceOf(
      Date,
    );
  });

  it('gives the pool those types', async () => {
    const providers = Reflect.getMetadata(
      'providers',
      DatabaseModule,
    ) as FactoryProvider[];
    const provider = providers.find((p) => p.provide === Pool)!;
    const config = { get: () => undefined } as unknown as ConfigService;
    const pool = provider.useFactory(config) as Pool;

    expect(
      (pool as unknown as { options: { types: unknown } }).options.types,
    ).toBe(pgTypes);
    await pool.end();
  });
});
