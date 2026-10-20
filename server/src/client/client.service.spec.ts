import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientRepository } from './client.repository.js';
import { ClientService } from './client.service.js';
import { mapRowToClient } from './client.mapper.js';
import { ClientImageService } from './client-image.service.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import type { CreateClientDto } from './dto/create-client.dto.js';

describe('ClientService', () => {
  let service: ClientService;
  const repository = {
    searchByName: vi.fn<ClientRepository['searchByName']>(),
    searchByDob: vi.fn<ClientRepository['searchByDob']>(),
    create: vi.fn(),
    insertIds: vi.fn(),
  };
  const connection = { query: vi.fn(), release: vi.fn() };
  const pool = { query: vi.fn(), connect: vi.fn() };
  const imagePath = 'images/clients/00000000-0000-4000-8000-000000000000.png';
  const images = { save: vi.fn(), removeCreatedImage: vi.fn() };
  const employees = { findActiveByPassword: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    pool.connect.mockResolvedValue(connection);
    images.save.mockResolvedValue(imagePath);
    const module = await Test.createTestingModule({
      providers: [
        ClientService,
        { provide: ClientRepository, useValue: repository },
        { provide: Pool, useValue: pool },
        { provide: ClientImageService, useValue: images },
        { provide: EmployeeRepository, useValue: employees },
      ],
    }).compile();
    service = module.get(ClientService);
  });

  it.each([
    [undefined, undefined],
    ['', ''],
    ['   ', '  '],
  ])(
    'returns [] without querying for empty names (%j, %j)',
    async (first, last) => {
      expect(await service.search(first, last)).toEqual([]);
      expect(repository.searchByName).not.toHaveBeenCalled();
      expect(pool.query).not.toHaveBeenCalled();
    },
  );

  it.each([
    [' Da ', ' Wa ', 'Da', 'Wa'],
    [' Da ', undefined, 'Da', ''],
    [undefined, ' Wa ', '', 'Wa'],
  ])(
    'passes trimmed names to the repository (%j, %j)',
    async (first, last, expectedFirst, expectedLast) => {
      const clients = [
        mapRowToClient({
          client_number: 1,
          first_name: 'Damon',
          last_name: 'Wang',
        }),
      ];
      repository.searchByName.mockResolvedValue(clients);

      expect(await service.search(first, last)).toEqual(clients);
      expect(repository.searchByName).toHaveBeenCalledExactlyOnceWith(
        expectedFirst,
        expectedLast,
      );
      expect(pool.query).not.toHaveBeenCalled();
    },
  );

  it('returns [] when the repository finds no matches', async () => {
    repository.searchByName.mockResolvedValue([]);

    expect(await service.search('Nobody')).toEqual([]);
    expect(repository.searchByName).toHaveBeenCalledExactlyOnceWith(
      'Nobody',
      '',
    );
  });

  it('propagates repository errors instead of returning an empty result', async () => {
    const error = new Error('Database unavailable');
    repository.searchByName.mockRejectedValue(error);

    await expect(service.search('Da')).rejects.toBe(error);
    expect(repository.searchByName).toHaveBeenCalledExactlyOnceWith('Da', '');
  });
  it('trims the DOB and returns repository results', async () => {
    const clients = [mapRowToClient({ client_number: 1 })];
    repository.searchByDob.mockResolvedValue(clients);
    expect(await service.searchByDob(' 1990-01-01 ')).toEqual(clients);
    expect(repository.searchByDob).toHaveBeenCalledExactlyOnceWith(
      '1990-01-01',
    );
  });

  it('skips the repository for a blank DOB', async () => {
    expect(await service.searchByDob('   ')).toEqual([]);
    expect(repository.searchByDob).not.toHaveBeenCalled();
  });

  it('returns no DOB matches without inventing data', async () => {
    repository.searchByDob.mockResolvedValue([]);
    expect(await service.searchByDob('1990-01-01')).toEqual([]);
  });

  it('propagates DOB repository errors', async () => {
    const error = new Error('Database unavailable');
    repository.searchByDob.mockRejectedValue(error);
    await expect(service.searchByDob('1990-01-01')).rejects.toBe(error);
  });

  function createInput(): CreateClientDto {
    return {
      client: {
        first_name: 'Damon',
        last_name: 'Wang',
        date_of_birth: '1990-01-01',
        gender: 'M',
        hair_color: 'BROWN',
        eye_color: 'BROWN',
        height_cm: 180,
        weight_kg: 80,
        address: 'Test address',
        city: 'Saskatoon',
        province: 'SK',
        country: 'Canada',
      },
      photo: { fileName: 'test.png', base64: 'fixture-photo' },
      identifications: [
        { id_type: 'TEST', id_value: '1' },
        { id_type: 'TEST', id_value: '2' },
      ],
    };
  }

  it('creates a client and IDs on one connection, then commits and releases', async () => {
    const input = createInput();
    repository.create.mockResolvedValue({
      ...input.client,
      image_path: imagePath,
      client_number: 1,
    });
    repository.insertIds.mockResolvedValue(input.identifications);
    const client = await service.create(input);
    expect(client.client_number).toBe(1);
    expect(client.identifications).toHaveLength(2);
    expect(repository.create).toHaveBeenCalledWith(
      { ...input.client, image_path: imagePath },
      '',
      connection,
    );
    expect(repository.insertIds).toHaveBeenCalledWith(
      1,
      input.identifications,
      connection,
    );
    expect(connection.query.mock.calls).toEqual([['BEGIN'], ['COMMIT']]);
    expect(connection.release).toHaveBeenCalledOnce();
    expect(images.save).toHaveBeenCalledWith(input.photo.base64);
    expect(images.removeCreatedImage).not.toHaveBeenCalled();
  });

  it('rolls back and releases when inserting IDs fails', async () => {
    repository.create.mockResolvedValue({ client_number: 1 });
    const error = new Error('ID insert failed');
    repository.insertIds.mockRejectedValue(error);
    await expect(service.create(createInput())).rejects.toBe(error);
    expect(connection.query.mock.calls).toEqual([['BEGIN'], ['ROLLBACK']]);
    expect(connection.release).toHaveBeenCalledOnce();
    expect(images.removeCreatedImage).toHaveBeenCalledWith(imagePath);
  });

  it('rejects unsigned notes before opening a connection', async () => {
    const input = createInput();
    input.client.notes = 'Test note';
    await expect(service.create(input)).rejects.toThrow('signature');
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('rejects underage clients on the backend', async () => {
    const input = createInput();
    input.client.date_of_birth = '2099-01-01';
    await expect(service.create(input)).rejects.toThrow('Age under 18');
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('rolls back when saving the submitted photo fails', async () => {
    images.save.mockRejectedValue(new Error('Invalid image'));
    await expect(service.create(createInput())).rejects.toThrow(
      'Invalid image',
    );
    expect(connection.query).toHaveBeenCalledWith('ROLLBACK');
    expect(repository.create).not.toHaveBeenCalled();
    expect(images.removeCreatedImage).not.toHaveBeenCalled();
  });

  it('rejects an incorrect employee password and rolls back', async () => {
    const input = createInput();
    input.client.notes = 'Test note';
    input.notes_action = 'append_signature';
    input.employee_password = 'incorrect';
    employees.findActiveByPassword.mockResolvedValue(null);
    await expect(service.create(input)).rejects.toMatchObject({
      response: {
        field: 'employee_password',
        message: 'Employee password is incorrect.',
      },
    });
    expect(repository.create).not.toHaveBeenCalled();
    expect(connection.query).toHaveBeenCalledWith('ROLLBACK');
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('attributes notes to the employee without establishing a login session', async () => {
    const input = createInput();
    input.client.notes = ' Test note ';
    input.notes_action = 'append_signature';
    input.employee_password = ' employee-code ';
    employees.findActiveByPassword.mockResolvedValue({
      employee_number: 7,
      first_name: 'STAFF',
    });
    repository.create.mockResolvedValue({ client_number: 1 });
    repository.insertIds.mockResolvedValue([]);
    await service.create(input);
    expect(employees.findActiveByPassword).toHaveBeenCalledWith(
      'employee-code',
      connection,
    );
    expect(repository.create).toHaveBeenCalledWith(
      { ...input.client, image_path: imagePath },
      expect.stringMatching(/^Test note \(STAFF, \d{4}-\d{2}-\d{2}\)$/),
      connection,
    );
  });
  it('retains the photo if COMMIT has an uncertain outcome', async () => {
    repository.create.mockResolvedValue({ client_number: 1 });
    repository.insertIds.mockResolvedValue([]);
    const error = new Error('Connection lost during COMMIT');
    connection.query.mockImplementation(async (sql: string) => {
      if (sql === 'COMMIT') throw error;
    });
    await expect(service.create(createInput())).rejects.toBe(error);
    expect(images.removeCreatedImage).not.toHaveBeenCalled();
  });
});
