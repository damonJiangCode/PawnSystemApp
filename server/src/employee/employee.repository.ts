import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';

@Injectable()
export class EmployeeRepository {
  async findActiveByPassword(password: string, connection: PoolClient) {
    const result = await connection.query<{
      employee_number: number;
      first_name: string;
    }>(
      `SELECT employee_number, first_name FROM employee
       WHERE password = $1 AND is_terminated = FALSE LIMIT 1`,
      [password],
    );
    return result.rows[0] ?? null;
  }
}
