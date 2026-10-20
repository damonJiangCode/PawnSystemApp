import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientRepository } from './client.repository.js';
import { ClientService } from './client.service.js';
import { mapRowToClient } from './client.mapper.js';

describe('ClientService searches', () => {
  let service: ClientService;
  const repository = {
    searchByName: vi.fn<ClientRepository['searchByName']>(),
    searchByDob: vi.fn<ClientRepository['searchByDob']>(),
  };
  const pool = { query: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ClientService,
        { provide: ClientRepository, useValue: repository },
        { provide: Pool, useValue: pool },
      ],
    }).compile();
    service = module.get(ClientService);
  });

  it.each([
    [undefined, undefined],
    ['', ''],
    ['   ', '  '],
  ])('returns [] without querying for empty names (%j, %j)', async (first, last) => {
    expect(await service.search(first, last)).toEqual([]);
    expect(repository.searchByName).not.toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it.each([
    [' Da ', ' Wa ', 'Da', 'Wa'],
    [' Da ', undefined, 'Da', ''],
    [undefined, ' Wa ', '', 'Wa'],
  ])('passes trimmed names to the repository (%j, %j)', async (first, last, expectedFirst, expectedLast) => {
    const clients = [
      mapRowToClient({ client_number: 1, first_name: 'Damon', last_name: 'Wang' }),
    ];
    repository.searchByName.mockResolvedValue(clients);

    expect(await service.search(first, last)).toEqual(clients);
    expect(repository.searchByName).toHaveBeenCalledExactlyOnceWith(
      expectedFirst,
      expectedLast,
    );
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns [] when the repository finds no matches', async () => {
    repository.searchByName.mockResolvedValue([]);

    expect(await service.search('Nobody')).toEqual([]);
    expect(repository.searchByName).toHaveBeenCalledExactlyOnceWith('Nobody', '');
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
    expect(repository.searchByDob).toHaveBeenCalledExactlyOnceWith('1990-01-01');
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

});
