import type { Employee } from "../../../../shared/models/employee.model";
import type { EmployeeMutationResult } from "../../../../shared/api-contracts/employeeApi.contract";
import type {
  CreateEmployeeInput,
  EmployeeFormField,
  EmployeeSearchInput,
  UpdateEmployeeInput,
} from "../../../../shared/payload-contracts/employee.contract";
import { getAppApi } from "../../shared/api/app.api";
import { extractBackendFieldError } from "../../shared/utils/formError";

export type EmployeeFormError = Error & {
  field: EmployeeFormField;
};

const createEmployeeFormError = (
  field: EmployeeFormField,
  message: string,
): EmployeeFormError => {
  const error = new Error(message) as EmployeeFormError;
  error.field = field;
  return error;
};

const mapEmployeeSaveError = (error: unknown): EmployeeFormError => {
  if (error instanceof Error) {
    const fieldError = extractBackendFieldError(error.message);

    if (fieldError) {
      return createEmployeeFormError(
        fieldError.field as EmployeeFormField,
        fieldError.message,
      );
    }
  }

  console.error("Employee save failed", error);
  return createEmployeeFormError("form", "Unable to save employee.");
};

const unwrapEmployeeMutation = (result: EmployeeMutationResult): Employee => {
  if (!result.ok) {
    throw createEmployeeFormError(result.field, result.message);
  }

  return result.employee;
};

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

const normalizeCreateEmployeeInput = (
  input: CreateEmployeeInput,
): CreateEmployeeInput => ({
  ...normalizeEmployeeDetails(input),
  password: input.password?.trim() ?? "",
  manager_password: input.manager_password?.trim() ?? "",
});

const normalizeUpdateEmployeeInput = (
  input: UpdateEmployeeInput,
): UpdateEmployeeInput => ({
  ...normalizeEmployeeDetails(input),
  password: input.password?.trim() || undefined,
  manager_password: input.manager_password?.trim() ?? "",
});

const normalizeEmployeeSearchInput = (
  input: EmployeeSearchInput,
): EmployeeSearchInput => ({
  first_name: input.first_name?.trim() ?? "",
  last_name: input.last_name?.trim() ?? "",
});

export const employeeApi = {
  createEmployee: async (input: CreateEmployeeInput): Promise<Employee> => {
    const api = getAppApi()?.employee;

    if (!api) {
      throw new Error("Employee API is unavailable.");
    }

    let result;

    try {
      result = await api.createEmployee(normalizeCreateEmployeeInput(input));
    } catch (error) {
      throw mapEmployeeSaveError(error);
    }

    return unwrapEmployeeMutation(result);
  },

  searchEmployees: async (input: EmployeeSearchInput): Promise<Employee[]> => {
    const api = getAppApi()?.employee;

    if (!api) {
      throw new Error("Employee API is unavailable.");
    }

    return api.searchEmployees(normalizeEmployeeSearchInput(input));
  },

  updateEmployee: async (
    employeeNumber: number,
    input: UpdateEmployeeInput,
  ): Promise<Employee> => {
    const api = getAppApi()?.employee;

    if (!api) {
      throw new Error("Employee API is unavailable.");
    }

    let result;

    try {
      result = await api.updateEmployee(
        employeeNumber,
        normalizeUpdateEmployeeInput(input),
      );
    } catch (error) {
      throw mapEmployeeSaveError(error);
    }

    return unwrapEmployeeMutation(result);
  },
};

export type {
  CreateEmployeeInput,
  Employee,
  EmployeeFormField,
  EmployeeSearchInput,
  UpdateEmployeeInput,
};
