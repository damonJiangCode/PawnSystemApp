import { types } from 'pg';
import { describe, expect, it } from 'vitest';
import './database.module.js';

describe('DatabaseModule', () => {
  it('returns DATE columns as YYYY-MM-DD strings, not Dates', () => {
    const parseDate = types.getTypeParser(1082);
    expect(parseDate('1990-01-01')).toBe('1990-01-01');
  });
});
