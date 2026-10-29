import type { EmployeeApi } from "../../../../shared/api-contracts/employeeApi.contract";
import type { Employee } from "../../../../shared/models/employee.model";
import type {
  CreateEmployeeInput,
  EmployeeFormField,
  EmployeeSearchInput,
  UpdateEmployeeInput,
} from "../../../../shared/payload-contracts/employee.contract";
import { getAppApi } from "../../shared/api/app.api";

export type EmployeeFormError = Error & {
  field?: EmployeeFormField;
};

const api = (): EmployeeApi => {
  const employee = getAppApi()?.employee;
  if (!employee) throw new Error("Employee API is unavailable.");
  return employee;
};

// The server trims, uppercases and validates; errors keep the server's `field`.
export const employeeApi = {
  createEmployee: (input: CreateEmployeeInput): Promise<Employee> =>
    api().createEmployee(input),

  searchEmployees: (input: EmployeeSearchInput): Promise<Employee[]> =>
    api().searchEmployees(input),

  updateEmployee: (
    employeeNumber: number,
    input: UpdateEmployeeInput,
  ): Promise<Employee> => api().updateEmployee(employeeNumber, input),
};

export type {
  CreateEmployeeInput,
  Employee,
  EmployeeFormField,
  EmployeeSearchInput,
  UpdateEmployeeInput,
};
