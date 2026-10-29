import { employeeRepo } from "./employee.repo.ts";
import type { DbClient } from "../../../../../database/connection.ts";

export const employeeService = {
  findByPassword: async (password: string, dbClient?: DbClient) => {
    const safePassword = password?.trim() ?? "";

    if (!safePassword) {
      return null;
    }

    return employeeRepo.findActiveByPassword(safePassword, dbClient);
  },

  getEmployeeDisplayNameByPassword: async (
    password: string,
    dbClient?: DbClient,
  ): Promise<string | null> => {
    const employee = await employeeService.findByPassword(password, dbClient);

    if (!employee) {
      return null;
    }

    return employee.nickname?.trim() || employee.first_name;
  },
};
