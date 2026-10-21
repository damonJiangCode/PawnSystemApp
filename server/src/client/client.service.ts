import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { ClientRepository, type ClientChanges } from './client.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ClientImageService } from './client-image.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { mapRowToClient } from './client.mapper.js';
import { UpdateClientDto } from './dto/update-client.dto.js';

@Injectable()
export class ClientService {
  constructor(
    private readonly pool: Pool,
    private readonly clientRepository: ClientRepository,
    private readonly employees: EmployeeRepository,
    private readonly images: ClientImageService,
  ) {}

  async update(clientNumber: number, input: UpdateClientDto) {
    if (!Number.isSafeInteger(clientNumber) || clientNumber <= 0) {
      throw new BadRequestException('Enter a valid client number.');
    }
    const changes: ClientChanges = Object.fromEntries(
      Object.entries(input.client ?? {}).filter(
        ([, value]) => value !== undefined,
      ),
    );
    if (Object.values(changes).some((value) => value === null)) {
      throw new BadRequestException(
        'Use an empty string to clear optional text fields; null is not allowed.',
      );
    }
    if (
      !Object.keys(changes).length &&
      input.identifications === undefined &&
      !input.photo &&
      input.notes_action !== 'clear'
    ) {
      throw new BadRequestException('Provide at least one change.');
    }
    if (changes.date_of_birth !== undefined) {
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Regina',
      }).format(new Date());
      const cutoff = new Date(`${today}T00:00:00Z`);
      cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 18);
      if (changes.date_of_birth > cutoff.toISOString().slice(0, 10)) {
        throw new BadRequestException('Age under 18 is not allowed.');
      }
    }
    if (input.notes_action === 'append_signature' && !changes.notes?.trim()) {
      throw new BadRequestException('Provide non-empty notes to sign.');
    }
    if (input.notes_action === 'clear' && changes.notes?.trim()) {
      throw new BadRequestException(
        'Clearing notes cannot include non-empty notes.',
      );
    }

    const connection = await this.pool.connect();
    let imagePath: string | undefined;
    let commitStarted = false;
    let rollbackFailed = false;
    try {
      await connection.query('BEGIN');
      // Check attribution before saving files, changing records or replacing IDs.
      let employee: { first_name: string } | null = null;
      if (input.notes_action === 'append_signature') {
        const password = input.employee_password?.trim();
        employee = password
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
      }
      const existing = await this.clientRepository.loadForUpdate(
        clientNumber,
        connection,
      );
      if (!existing) throw new NotFoundException('Client not found.');

      if (input.notes_action === 'clear') changes.notes = '';
      if (changes.notes !== undefined) {
        const notes = changes.notes.trim();
        const previousNotes = String(existing.notes ?? '').trim();
        if (notes && notes !== previousNotes && !employee) {
          throw new BadRequestException(
            'Notes require an employee signature before saving.',
          );
        }
        if (employee) {
          const date = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Regina',
          }).format(new Date());
          changes.notes = `${notes} (${employee.first_name}, ${date})`;
        } else changes.notes = notes;
      }
      if (input.photo) {
        imagePath = await this.images.save(input.photo.base64);
        changes.image_path = imagePath;
      }
      const row = await this.clientRepository.update(
        clientNumber,
        changes,
        connection,
      );
      let ids;
      if (input.identifications !== undefined) {
        await this.clientRepository.deleteIds(clientNumber, connection);
        ids = await this.clientRepository.insertIds(
          clientNumber,
          input.identifications,
          connection,
        );
      } else {
        ids = await this.clientRepository.loadIds(clientNumber, connection);
      }
      const client = mapRowToClient({ ...row, identifications: ids });
      commitStarted = true;
      await connection.query('COMMIT');
      return client;
    } catch (error) {
      try {
        await connection.query('ROLLBACK');
      } catch {
        rollbackFailed = true;
        console.error('Client update rollback failed');
      }
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
