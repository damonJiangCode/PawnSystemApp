import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientRepository } from './client.repository.js';
import { ClientService } from './client.service.js';
import { mapRowToClient } from './client.mapper.js';

describe('ClientService.search', () => {
  let service: ClientService;
  const repository = {
    searchByName: vi.fn<ClientRepository['searchByName']>(),
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
});
