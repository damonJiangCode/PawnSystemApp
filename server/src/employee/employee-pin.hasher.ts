import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';

const MIN_SECRET_LENGTH = 32;

// Same algorithm as database/migration/scripts/employee-pin.cjs. A keyed hash
// (not a salted one) so an employee can still be found by PIN alone.
@Injectable()
export class EmployeePinHasher {
  private readonly secret: string;

  constructor(config: ConfigService) {
    const secret = config.get<string>('EMPLOYEE_PIN_SECRET')?.trim() ?? '';
    if (secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `Set EMPLOYEE_PIN_SECRET (at least ${MIN_SECRET_LENGTH} characters).`,
      );
    }
    this.secret = secret;
  }

  hash(pin: string) {
    return createHmac('sha256', this.secret).update(pin.trim()).digest('hex');
  }
}
