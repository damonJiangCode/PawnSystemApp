import { describe, expect, it } from 'vitest';
import { dateOnly } from './date-only.js';

describe('dateOnly', () => {
  it('passes a YYYY-MM-DD string through', () => {
    expect(dateOnly('1990-01-01', 'date_of_birth')).toBe('1990-01-01');
  });

  it.each([new Date('1990-01-01T00:00:00Z'), '1990-1-1', '', null, 19900101])(
    'rejects %s instead of turning it into text',
    (value) => {
      expect(() => dateOnly(value, 'date_of_birth')).toThrow(
        'Expected date_of_birth as YYYY-MM-DD',
      );
    },
  );
});
