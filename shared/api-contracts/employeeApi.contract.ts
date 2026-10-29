import type { Employee } from "../models/employee.model.ts";
import type {
  CreateEmployeeInput,
  EmployeeSearchInput,
  UpdateEmployeeInput,
} from "../payload-contracts/employee.contract.ts";

// Failed saves reject with an Error whose `field` names the form field
// (`password`, `manager_password` or `form`) when the server provides one.
export type EmployeeApi = {
  createEmployee: (input: CreateEmployeeInput) => Promise<Employee>;
  searchEmployees: (input: EmployeeSearchInput) => Promise<Employee[]>;
  updateEmployee: (
    employeeNumber: number,
    input: UpdateEmployeeInput,
  ) => Promise<Employee>;
};
