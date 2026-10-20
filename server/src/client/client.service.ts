import { BadRequestException, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { ClientRepository } from './client.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ClientImageService } from './client-image.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { mapRowToClient } from './client.mapper.js';

@Injectable()
export class ClientService {
  constructor(
    private readonly pool: Pool,
    private readonly clientRepository: ClientRepository,
    private readonly employees: EmployeeRepository,
    private readonly images: ClientImageService,
  ) {}

  async create(input: CreateClientDto) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Regina',
    }).format(new Date());
    const cutoff = new Date(`${today}T00:00:00Z`);
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 18);
    if (input.client.date_of_birth > cutoff.toISOString().slice(0, 10)) {
      throw new BadRequestException('Age under 18 is not allowed.');
    }
    let notes = input.client.notes?.trim() ?? '';
    if (notes && input.notes_action !== 'append_signature') {
      throw new BadRequestException(
        'Notes require an employee signature before saving.',
      );
    }
    const connection = await this.pool.connect();
    let imagePath: string | undefined;
    let commitStarted = false;
    let rollbackFailed = false;
    try {
      await connection.query('BEGIN');
      if (input.notes_action === 'append_signature') {
        const password = input.employee_password?.trim();
        const employee = password
          ? await this.employees.findActiveByPassword(password, connection)
          : null;
        if (!employee) {
          throw new BadRequestException({
            field: 'employee_password',
            message: password
              ? 'Employee password is incorrect.'
              : 'Employee password is required.',
          });
        }
        if (notes) {
          const date = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Regina',
          }).format(new Date());
          notes = `${notes} (${employee.first_name}, ${date})`;
        }
      }
      imagePath = await this.images.save(input.photo.base64);
      const row = await this.clientRepository.create(
        { ...input.client, image_path: imagePath },
        notes,
        connection,
      );
      const ids = await this.clientRepository.insertIds(
        Number(row.client_number),
        input.identifications,
        connection,
      );
      const client = mapRowToClient({ ...row, identifications: ids });
      commitStarted = true;
      await connection.query('COMMIT');
      return client;
    } catch (error) {
      try {
        await connection.query('ROLLBACK');
      } catch {
        rollbackFailed = true;
        console.error('Client creation rollback failed');
      }
      // A lost COMMIT response has an uncertain outcome; retain the photo to avoid
      // deleting a file that may already belong to a committed client.
      if (imagePath && !commitStarted) {
        try {
          await this.images.removeCreatedImage(imagePath);
        } catch {
          console.error('Could not clean up the failed client photo');
        }
      }
      if ((error as { code?: string }).code === '23503') {
        throw new BadRequestException(
          'Select valid hair color, eye color and ID types.',
        );
      }
      throw error;
    } finally {
      if (rollbackFailed) connection.release(true);
      else connection.release();
    }
  }

  async checkDatabaseConnection() {
    const result = await this.pool.query('SELECT 1 AS value');
    return result.rows[0];
  }
  async search(firstName?: string, lastName?: string) {
    const first = firstName?.trim() ?? '';
    const last = lastName?.trim() ?? '';
    if (!first && !last) {
      return [];
    }

    return this.clientRepository.searchByName(first, last);
  }
  async searchByDob(dateOfBirth: string) {
    const date = dateOfBirth.trim();
    if (!date) return [];
    return this.clientRepository.searchByDob(date);
  }
}
