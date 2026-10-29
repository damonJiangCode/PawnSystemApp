import type { Pool, PoolClient } from 'pg';

// Runs `work` on one connection inside BEGIN/COMMIT. Any error rolls back and is
// rethrown unchanged; a failed ROLLBACK must not hide the original error.
export async function inTransaction<T>(
  pool: Pool,
  work: (connection: PoolClient) => Promise<T>,
): Promise<T> {
  const connection = await pool.connect();
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
