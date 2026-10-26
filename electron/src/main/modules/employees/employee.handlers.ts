import type { IpcMainInvokeEvent } from "electron";
import type {
  CreateEmployeeInput,
  EmployeeFormField,
  EmployeeSearchInput,
  UpdateEmployeeInput,
} from "../../../../../shared/payload-contracts/employee.contract.ts";
import type { EmployeeMutationResult } from "../../../../../shared/api-contracts/employeeApi.contract.ts";
import type { Employee } from "../../../../../shared/models/employee.model.ts";
import { extractFieldError } from "../../shared/createFieldError.ts";
import { employeeService } from "./employee.service.ts";
import { CHANNELS } from "../../ipc/channels.ts";

const { ipcMain } = require("electron/main") as typeof import("electron");

const runEmployeeMutation = async (
  operation: () => Promise<Employee>,
): Promise<EmployeeMutationResult> => {
  try {
    return { ok: true, employee: await operation() };
  } catch (error) {
    const fieldError = extractFieldError(error);

    if (fieldError) {
      return {
        ok: false,
        field: fieldError.field as EmployeeFormField,
        message: fieldError.message,
      };
    }

    throw error;
  }
};

export const registerEmployeeHandlers = () => {
  ipcMain.handle(
    CHANNELS.ADD_EMPLOYEE,
    async (_event: IpcMainInvokeEvent, payload: CreateEmployeeInput) => {
      return runEmployeeMutation(() => employeeService.createEmployee(payload));
    },
  );

  ipcMain.handle(
    CHANNELS.SEARCH_EMPLOYEES,
    async (_event: IpcMainInvokeEvent, payload: EmployeeSearchInput) => {
      return employeeService.searchEmployees(payload);
    },
  );

  ipcMain.handle(
    CHANNELS.UPDATE_EMPLOYEE,
    async (
      _event: IpcMainInvokeEvent,
      employeeNumber: number,
      payload: UpdateEmployeeInput,
    ) => {
      return runEmployeeMutation(() =>
        employeeService.updateEmployee(employeeNumber, payload),
      );
    },
  );
};
