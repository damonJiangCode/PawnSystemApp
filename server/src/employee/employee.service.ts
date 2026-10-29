import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';
import type {
  CreateEmployeeDto,
  SearchEmployeeDto,
  UpdateEmployeeDto,
} from './employee.dto.js';
import {
  EmployeeRepository,
  type EmployeeDetails,
  type EmployeeRecord,
} from './employee.repository.js';

const toDetails = (
  input: CreateEmployeeDto | UpdateEmployeeDto,
): EmployeeDetails => ({
  first_name: input.first_name,
  last_name: input.last_name,
  nickname: input.nickname ?? '',
  date_of_birth: input.date_of_birth,
  gender: input.gender,
  is_terminated: input.is_terminated,
  is_manager: input.is_manager,
  address: input.address ?? '',
  phone: input.phone ?? '',
  email: input.email ?? '',
});

const pinInUse = () =>
  new ConflictException({
    field: 'password',
    message: 'Password is already in use.',
  });

@Injectable()
export class EmployeeService {
  constructor(
    private readonly pool: Pool,
    private readonly repository: EmployeeRepository,
  ) {}

  search(input: SearchEmployeeDto) {
    return this.repository.search(
      input.first_name ?? '',
      input.last_name ?? '',
    );
  }

  create(input: CreateEmployeeDto) {
    return this.inTransaction(async (connection) => {
      await this.authorizeManager(input.manager_password, connection);
      const result = await this.repository.create(
        toDetails(input),
        input.password,
        connection,
      );
      if ('error' in result) throw pinInUse();
      return result.value;
    });
  }

  update(employeeNumber: number, input: UpdateEmployeeDto) {
    return this.inTransaction(async (connection) => {
      await this.authorizeManager(input.manager_password, connection);
      const activeManagers =
        await this.repository.lockActiveManagers(connection);
      const existing = await this.repository.loadForUpdate(
        employeeNumber,
        connection,
      );
      if (!existing) {
        throw new NotFoundException({
          field: 'form',
          message: 'No employee was found for that number.',
        });
      }
      const removesActiveManager =
        activeManagers.includes(employeeNumber) &&
        (!input.is_manager || input.is_terminated);
      if (removesActiveManager && activeManagers.length === 1) {
        throw new ConflictException({
          field: 'form',
          message: 'At least one active manager is required.',
        });
      }
      const result = await this.repository.update(
        employeeNumber,
        toDetails(input),
        input.password,
        connection,
      );
      if ('error' in result) throw pinInUse();
      return result.value;
    });
  }

  private async authorizeManager(password: string, connection: PoolClient) {
    const manager = await this.repository.findActiveManagerByPassword(
      password,
      connection,
    );
    if (!manager) {
      throw new ForbiddenException({
        field: 'manager_password',
        message: 'Manager password is incorrect.',
      });
    }
  }

  private async inTransaction(
    work: (connection: PoolClient) => Promise<EmployeeRecord>,
  ) {
    const connection = await this.pool.connect();
    try {
      await connection.query('BEGIN');
      const value = await work(connection);
      await connection.query('COMMIT');
      return value;
    } catch (error) {
      await connection.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      connection.release();
    }
  }
}
