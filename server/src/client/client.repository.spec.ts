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

describe('ClientRepository.update', () => {
  it.each(['2026-11-15', null])(
    'writes hold and notes together using parameters (%s)',
    async (hold_until) => {
      const query = vi
        .fn()
        .mockResolvedValue({ rows: [{ client_number: 42 }] });
      const repository = new ClientRepository({} as Pool);
      await repository.update(
        42,
        { hold_until, notes: 'History\nHold entry' },
        { query } as unknown as PoolClient,
      );
      expect(query).toHaveBeenCalledOnce();
      const [sql, values] = query.mock.calls[0];
      expect(sql).toContain('notes = $2');
      expect(sql).toContain('hold_until = $3');
      expect(sql).not.toContain('2026-11-15');
      expect(values).toEqual([42, 'History\nHold entry', hold_until]);
    },
  );
  it('updates only allowed submitted columns using parameters', async () => {
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [{ client_number: 42, phone: null }] });
    const repository = new ClientRepository({} as Pool);
    await repository.update(42, { phone: '', first_name: " O'Neil " }, {
      query,
    } as unknown as PoolClient);
    const [sql, values] = query.mock.calls[0];
    expect(sql).toContain('first_name = $2');
    expect(sql).toContain('phone = $3');
    expect(sql).not.toContain('redeem_count');
    expect(sql).not.toContain('image_path');
    expect(sql).not.toContain("O'Neil");
    expect(values).toEqual([42, "O'NEIL", null]);
  });

  it('locks the selected client before the service changes it', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ client_number: 42 }] });
    const repository = new ClientRepository({} as Pool);
    await repository.loadForUpdate(42, { query } as unknown as PoolClient);
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(query.mock.calls[0][1]).toEqual([42]);
  });
});
