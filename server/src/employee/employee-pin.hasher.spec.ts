import { ConfigService } from '@nestjs/config';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { EmployeePinHasher } from './employee-pin.hasher.js';

const require = createRequire(import.meta.url);
const migrationPin =
  require('../../../database/migration/scripts/employee-pin.cjs') as {
    hashEmployeePin: (pin: string, secret: string) => string;
  };

const secret = 's'.repeat(32);
const hasher = () =>
  new EmployeePinHasher(new ConfigService({ EMPLOYEE_PIN_SECRET: secret }));

describe('EmployeePinHasher', () => {
  it('matches the migration script so imported PINs keep working', () => {
    for (const pin of ['1', '1234', ' 0042 ', 'legacy-999']) {
      expect(hasher().hash(pin)).toBe(
        migrationPin.hashEmployeePin(pin, secret),
      );
    }
  });

  it('returns a 64-character hex digest that does not contain the PIN', () => {
    const hash = hasher().hash('1234');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain('1234');
  });

  it.each([undefined, '', 'short'])(
    'refuses to start without a strong secret (%s)',
    (value) => {
      expect(
        () =>
          new EmployeePinHasher(
            new ConfigService({ EMPLOYEE_PIN_SECRET: value }),
          ),
      ).toThrow(/EMPLOYEE_PIN_SECRET/);
    },
  );
});
