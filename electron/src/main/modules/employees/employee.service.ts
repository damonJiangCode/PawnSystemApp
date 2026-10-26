import { employeeRepo } from "./employee.repo.ts";
import type { DbClient } from "../../../../../database/connection.ts";
import type { Employee } from "../../../../../shared/models/employee.model.ts";
import type {
  CreateEmployeeInput,
  EmployeeSearchInput,
  UpdateEmployeeInput,
} from "../../../../../shared/payload-contracts/employee.contract.ts";
import { createFieldError } from "../../shared/createFieldError.ts";
import { employeeInput } from "./employee.input.ts";

const authorizeManager = async (managerPassword: string): Promise<void> => {
  const manager =
    await employeeRepo.findActiveManagerByPassword(managerPassword);

  if (!manager) {
    throw createFieldError(
      "manager_password",
      "Manager password is incorrect.",
    );
  }
};

export const employeeService = {
  findByPassword: async (password: string, dbClient?: DbClient) => {
    const safePassword = password?.trim() ?? "";

    if (!safePassword) {
      return null;
    }

    return employeeRepo.findByPassword(safePassword, dbClient);
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

  searchEmployees: async (input: EmployeeSearchInput): Promise<Employee[]> => {
    const normalizedInput = employeeInput.normalizeEmployeeSearch(input);

    return employeeRepo.search(normalizedInput);
  },

  createEmployee: async (input: CreateEmployeeInput): Promise<Employee> => {
    const normalizedInput = employeeInput.normalizeCreateEmployee(input);

    employeeInput.validateCreateEmployee(normalizedInput);
    await authorizeManager(normalizedInput.manager_password);

    const existingEmployee = await employeeRepo.findByPassword(
      normalizedInput.password,
      undefined,
      true,
    );

    if (existingEmployee) {
      throw createFieldError("password", "Password is already in use.");
    }

    const { manager_password: _managerPassword, ...employeeData } =
      normalizedInput;

    return employeeRepo.create(employeeData);
  },

  updateEmployee: async (
    employeeNumber: number,
    input: UpdateEmployeeInput,
  ): Promise<Employee> => {
    if (!Number.isInteger(employeeNumber) || employeeNumber <= 0) {
      throw createFieldError("form", "Enter a valid employee number.");
    }

    const normalizedInput = employeeInput.normalizeUpdateEmployee(input);
    employeeInput.validateEmployeeDetails(normalizedInput);
    await authorizeManager(normalizedInput.manager_password);

    const existingEmployee =
      await employeeRepo.findByEmployeeNumber(employeeNumber);

    if (!existingEmployee) {
      throw createFieldError("form", "No employee was found for that number.");
    }

    const removesLastActiveManager =
      existingEmployee.is_manager &&
      !existingEmployee.is_terminated &&
      (!normalizedInput.is_manager || normalizedInput.is_terminated);

    if (
      removesLastActiveManager &&
      !(await employeeRepo.hasOtherActiveManager(employeeNumber))
    ) {
      throw createFieldError(
        "form",
        "At least one active manager is required.",
      );
    }

    const employeeWithPassword = normalizedInput.password
      ? await employeeRepo.findByPassword(
          normalizedInput.password,
          undefined,
          true,
        )
      : null;

    if (
      employeeWithPassword &&
      employeeWithPassword.employee_number !== employeeNumber
    ) {
      throw createFieldError("password", "Password is already in use.");
    }

    const { manager_password: _managerPassword, ...employeeData } =
      normalizedInput;

    return employeeRepo.update(employeeNumber, employeeData);
  },
};
