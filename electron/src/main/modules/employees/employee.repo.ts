import { connect } from "../../../../../database/connection.ts";
import type { Employee } from "../../../../../shared/models/employee.model.ts";
import { hashEmployeePin } from "./employee.pin.ts";

type DbClient = Awaited<ReturnType<typeof connect>>;

export type EmployeeMatch = Pick<
  Employee,
  "employee_number" | "first_name" | "last_name" | "nickname"
>;

// Employee administration moved to the NestJS server; this lookup remains for
// ticket attribution until tickets are migrated.
export const employeeRepo = {
  findActiveByPassword: async (
    password: string,
    dbClient?: DbClient,
  ): Promise<EmployeeMatch | null> => {
    const client = dbClient ?? (await connect());

    try {
      const result = await client.query<EmployeeMatch>(
        `
          SELECT employee_number, first_name, last_name, nickname
          FROM employee
          WHERE pin_hash = $1
            AND is_terminated = FALSE
          LIMIT 1
        `,
        [hashEmployeePin(password)],
      );

      return result.rows[0] ?? null;
    } finally {
      if (!dbClient) {
        client.release();
      }
    }
  },
};
