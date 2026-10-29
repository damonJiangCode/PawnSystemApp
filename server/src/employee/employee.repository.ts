import { Injectable } from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';
import { EmployeePinHasher } from './employee-pin.hasher.js';

export type EmployeeRecord = {
  employee_number: number;
  first_name: string;
  last_name: string;
  nickname: string;
  date_of_birth: string;
  gender: string;
  is_terminated: boolean;
  is_manager: boolean;
  address: string;
  phone: string;
  email: string;
  created_at: Date;
  updated_at: Date;
};
export type EmployeeDetails = Omit<
  EmployeeRecord,
  'employee_number' | 'created_at' | 'updated_at'
>;
type SaveEmployeeResult = { value: EmployeeRecord } | { error: 'pin-in-use' };

// to_char keeps DATE as YYYY-MM-DD instead of a timezone-shifted JS Date.
const employeeColumns = `employee_number, first_name, last_name, nickname,
  to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth, gender,
  is_terminated, is_manager, address, phone, email, created_at, updated_at`;

const isPinConflict = (error: unknown) =>
  (error as { code?: string; constraint?: string }).code === '23505' &&
  (error as { constraint?: string }).constraint === 'employee_pin_hash_key';

@Injectable()
export class EmployeeRepository {
  constructor(
    private readonly pool: Pool,
    private readonly pins: EmployeePinHasher,
  ) {}

  async findActiveByPassword(password: string, connection: PoolClient) {
    const result = await connection.query<{
      employee_number: number;
      first_name: string;
      nickname: string;
    }>(
      `SELECT employee_number, first_name, nickname FROM employee
       WHERE pin_hash = $1 AND is_terminated = FALSE LIMIT 1`,
      [this.pins.hash(password)],
    );
    return result.rows[0] ?? null;
  }

  async findActiveManagerByPassword(password: string, connection: PoolClient) {
    const result = await connection.query<{ employee_number: number }>(
      `SELECT employee_number FROM employee
       WHERE pin_hash = $1 AND is_manager = TRUE AND is_terminated = FALSE
       LIMIT 1`,
      [this.pins.hash(password)],
    );
    return result.rows[0] ?? null;
  }

  async search(firstName: string, lastName: string) {
    const first = firstName.replace(/[!%_]/g, '!$&');
    const last = lastName.replace(/[!%_]/g, '!$&');
    const result = await this.pool.query<EmployeeRecord>(
      `SELECT ${employeeColumns} FROM employee
       WHERE ($1 = '' OR first_name ILIKE ('%' || $1 || '%') ESCAPE '!')
         AND ($2 = '' OR last_name ILIKE ('%' || $2 || '%') ESCAPE '!')
       ORDER BY last_name, first_name, employee_number`,
      [first, last],
    );
    return result.rows;
  }

  // Locked in a fixed order before the target row so concurrent updates
  // cannot deadlock or both remove the last active manager.
  async lockActiveManagers(connection: PoolClient) {
    const result = await connection.query<{ employee_number: number }>(
      `SELECT employee_number FROM employee
       WHERE is_manager = TRUE AND is_terminated = FALSE
       ORDER BY employee_number FOR UPDATE`,
    );
    return result.rows.map((row) => row.employee_number);
  }

  async loadForUpdate(employeeNumber: number, connection: PoolClient) {
    const result = await connection.query<EmployeeRecord>(
      `SELECT ${employeeColumns} FROM employee
       WHERE employee_number = $1 FOR UPDATE`,
      [employeeNumber],
    );
    return result.rows[0] ?? null;
  }

  async create(
    details: EmployeeDetails,
    password: string,
    connection: PoolClient,
  ): Promise<SaveEmployeeResult> {
    try {
      const result = await connection.query<EmployeeRecord>(
        `INSERT INTO employee (first_name, last_name, nickname, date_of_birth,
           gender, is_terminated, is_manager, address, phone, email, pin_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING ${employeeColumns}`,
        [...detailValues(details), this.pins.hash(password)],
      );
      return { value: result.rows[0] };
    } catch (error) {
      if (isPinConflict(error)) return { error: 'pin-in-use' };
      throw error;
    }
  }

  async update(
    employeeNumber: number,
    details: EmployeeDetails,
    password: string | undefined,
    connection: PoolClient,
  ): Promise<SaveEmployeeResult> {
    try {
      const result = await connection.query<EmployeeRecord>(
        `UPDATE employee SET first_name = $2, last_name = $3, nickname = $4,
           date_of_birth = $5, gender = $6, is_terminated = $7,
           is_manager = $8, address = $9, phone = $10, email = $11,
           pin_hash = COALESCE($12, pin_hash), updated_at = CURRENT_TIMESTAMP
         WHERE employee_number = $1
         RETURNING ${employeeColumns}`,
        [
          employeeNumber,
          ...detailValues(details),
          password === undefined ? null : this.pins.hash(password),
        ],
      );
      return { value: result.rows[0] };
    } catch (error) {
      if (isPinConflict(error)) return { error: 'pin-in-use' };
      throw error;
    }
  }
}

const detailValues = (details: EmployeeDetails) => [
  details.first_name,
  details.last_name,
  details.nickname,
  details.date_of_birth,
  details.gender,
  details.is_terminated,
  details.is_manager,
  details.address,
  details.phone,
  details.email,
];
