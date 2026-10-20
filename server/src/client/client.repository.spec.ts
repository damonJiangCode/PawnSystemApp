import { Pool, type PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { ClientRepository } from './client.repository.js';

describe('ClientRepository.insertIds', () => {
  it('inserts all IDs in one parameterized query on the supplied connection', async () => {
    const rows = [
      { id: 1, id_type: 'LICENSE', id_value: 'ABC', updated_at: new Date() },
      {
        id: 2,
        id_type: 'PASSPORT',
        id_value: "O'Neil",
        updated_at: new Date(),
      },
      { id: 3, id_type: 'OTHER', id_value: 'XYZ', updated_at: new Date() },
    ];
    const query = vi.fn().mockResolvedValue({ rows });
    const poolQuery = vi.fn();
    const repository = new ClientRepository({
      query: poolQuery,
    } as unknown as Pool);

    const result = await repository.insertIds(
      42,
      [
        { id_type: ' LICENSE ', id_value: ' ABC ' },
        { id_type: 'PASSPORT', id_value: "O'Neil" },
        { id_type: 'OTHER', id_value: 'XYZ' },
      ],
      { query } as unknown as PoolClient,
    );

    expect(result).toEqual(rows);
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][0]).toContain(
      'VALUES ($1, $2, $3), ($1, $4, $5), ($1, $6, $7)',
    );
    expect(query.mock.calls[0][0]).not.toContain("O'Neil");
    expect(query.mock.calls[0][1]).toEqual([
      42,
      'LICENSE',
      'ABC',
      'PASSPORT',
      "O'Neil",
      'OTHER',
      'XYZ',
    ]);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it('skips the query for an empty list', async () => {
    const query = vi.fn();
    const repository = new ClientRepository({} as Pool);
    expect(
      await repository.insertIds(42, [], { query } as unknown as PoolClient),
    ).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it('propagates insertion failures so the service can roll back', async () => {
    const error = new Error('Invalid ID type');
    const query = vi.fn().mockRejectedValue(error);
    const repository = new ClientRepository({} as Pool);
    await expect(
      repository.insertIds(42, [{ id_type: 'INVALID', id_value: '123' }], {
        query,
      } as unknown as PoolClient),
    ).rejects.toBe(error);
  });
});
