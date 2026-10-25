import { connect, type DbClient } from "../../../database/connection.ts";

const rollbackQuietly = async (client: DbClient, scope: string) => {
  try {
    await client.query("ROLLBACK");
  } catch (rollbackError) {
    console.error(`[runInTransaction] rollback failed in ${scope}:`, rollbackError);
  }
};

export const runInTransaction = async <T>(
  scope: string,
  work: (client: DbClient) => Promise<T>,
): Promise<T> => {
  const client = await connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await rollbackQuietly(client, scope);
    throw error;
  } finally {
    client.release();
  }
};
