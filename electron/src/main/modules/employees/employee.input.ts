import type {
  CreateEmployeeInput,
  EmployeeSearchInput,
  UpdateEmployeeInput,
} from "../../../../../shared/payload-contracts/employee.contract.ts";
import { createFieldError } from "../../shared/createFieldError.ts";

const normalizeEmployeeDetails = (
  input: CreateEmployeeInput | UpdateEmployeeInput,
) => ({
  first_name: input.first_name?.trim().toUpperCase() ?? "",
  last_name: input.last_name?.trim().toUpperCase() ?? "",
  nickname: input.nickname?.trim().toUpperCase() ?? "",
  date_of_birth: input.date_of_birth?.trim() ?? "",
  gender: input.gender?.trim() ?? "",
  is_terminated: Boolean(input.is_terminated),
  is_manager: Boolean(input.is_manager),
  address: input.address?.trim() ?? "",
  phone: input.phone?.trim() ?? "",
  email: input.email?.trim() ?? "",
});

const normalizeCreateEmployee = (
  input: CreateEmployeeInput,
): CreateEmployeeInput => ({
  ...normalizeEmployeeDetails(input),
  password: input.password?.trim() ?? "",
  manager_password: input.manager_password?.trim() ?? "",
});

const normalizeUpdateEmployee = (
  input: UpdateEmployeeInput,
): UpdateEmployeeInput => ({
  ...normalizeEmployeeDetails(input),
  password: input.password?.trim() || undefined,
  manager_password: input.manager_password?.trim() ?? "",
});

const normalizeEmployeeSearch = (
  input: EmployeeSearchInput,
): EmployeeSearchInput => ({
  first_name: input.first_name?.trim() ?? "",
  last_name: input.last_name?.trim() ?? "",
});

const validateEmployeeDetails = (
  input: CreateEmployeeInput | UpdateEmployeeInput,
) => {
  if (!input.last_name) {
    throw createFieldError("last_name", "Last name is required.");
  }

  if (!input.first_name) {
    throw createFieldError("first_name", "First name is required.");
  }

  if (!input.date_of_birth) {
    throw createFieldError("date_of_birth", "Date of birth is required.");
  }

  if (!input.gender) {
    throw createFieldError("gender", "Gender is required.");
  }

  if (!input.manager_password) {
    throw createFieldError("manager_password", "Manager password is required.");
  }
};

const validateCreateEmployee = (input: CreateEmployeeInput) => {
  validateEmployeeDetails(input);

  if (!input.password) {
    throw createFieldError("password", "Password is required.");
  }
};

export const employeeInput = {
  normalizeCreateEmployee,
  normalizeUpdateEmployee,
  normalizeEmployeeSearch,
  validateEmployeeDetails,
  validateCreateEmployee,
};
