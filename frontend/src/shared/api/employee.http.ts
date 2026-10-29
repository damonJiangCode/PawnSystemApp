import type { EmployeeApi } from "../../../../shared/api-contracts/employeeApi.contract.ts";
import type { Employee } from "../../../../shared/models/employee.model.ts";
import type {
  CreateEmployeeInput,
  EmployeeSearchInput,
  UpdateEmployeeInput,
} from "../../../../shared/payload-contracts/employee.contract.ts";
import { API_BASE_URL, apiUrl, jsonBody, requestJson } from "./http.ts";

type EmployeeResponse = Omit<Employee, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

const toEmployee = (employee: EmployeeResponse): Employee => ({
  ...employee,
  created_at: employee.created_at ? new Date(employee.created_at) : undefined,
  updated_at: employee.updated_at ? new Date(employee.updated_at) : undefined,
});

// Only editable fields cross the write boundary; the employee number and
// timestamps are server-owned.
const detailsBody = (input: CreateEmployeeInput | UpdateEmployeeInput) => ({
  first_name: input.first_name,
  last_name: input.last_name,
  nickname: input.nickname,
  date_of_birth: input.date_of_birth,
  gender: input.gender,
  is_terminated: input.is_terminated,
  is_manager: input.is_manager,
  address: input.address,
  phone: input.phone,
  email: input.email,
  manager_password: input.manager_password,
});

export async function searchEmployeesHttp(
  input: EmployeeSearchInput,
  baseUrl = API_BASE_URL,
) {
  const url = apiUrl("/employees", baseUrl);
  for (const key of ["first_name", "last_name"] as const) {
    const value = input[key]?.trim();
    if (value) url.searchParams.set(key, value);
  }
  const employees = await requestJson<EmployeeResponse[]>(url);
  return employees.map(toEmployee);
}

export async function createEmployeeHttp(
  input: CreateEmployeeInput,
  baseUrl = API_BASE_URL,
) {
  const employee = await requestJson<EmployeeResponse>(
    apiUrl("/employees", baseUrl),
    jsonBody("POST", { ...detailsBody(input), password: input.password }),
  );
  return toEmployee(employee);
}

export async function updateEmployeeHttp(
  employeeNumber: number,
  input: UpdateEmployeeInput,
  baseUrl = API_BASE_URL,
) {
  const password = input.password?.trim();
  const employee = await requestJson<EmployeeResponse>(
    apiUrl(`/employees/${employeeNumber}`, baseUrl),
    jsonBody("PUT", {
      ...detailsBody(input),
      ...(password ? { password } : {}),
    }),
  );
  return toEmployee(employee);
}

export const createEmployeeHttpApi = (baseUrl = API_BASE_URL): EmployeeApi => ({
  createEmployee: (input) => createEmployeeHttp(input, baseUrl),
  searchEmployees: (input) => searchEmployeesHttp(input, baseUrl),
  updateEmployee: (employeeNumber, input) =>
    updateEmployeeHttp(employeeNumber, input, baseUrl),
});
