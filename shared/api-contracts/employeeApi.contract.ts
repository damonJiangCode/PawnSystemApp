import type { Employee } from "../models/employee.model.ts";
import type {
  CreateEmployeeInput,
  EmployeeFormField,
  EmployeeSearchInput,
  UpdateEmployeeInput,
} from "../payload-contracts/employee.contract.ts";

export type EmployeeMutationResult =
  | { ok: true; employee: Employee }
  | { ok: false; field: EmployeeFormField; message: string };

export type EmployeeApi = {
  createEmployee: (
    input: CreateEmployeeInput,
  ) => Promise<EmployeeMutationResult>;
  searchEmployees: (input: EmployeeSearchInput) => Promise<Employee[]>;
  updateEmployee: (
    employeeNumber: number,
    input: UpdateEmployeeInput,
  ) => Promise<EmployeeMutationResult>;
};
