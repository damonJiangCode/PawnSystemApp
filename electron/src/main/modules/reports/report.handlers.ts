import type { IpcMainInvokeEvent } from "electron";
import type {
  OverdueReportInput,
  ReportDateRangeInput,
} from "../../../../../shared/payload-contracts/ticket.contract.ts";
import { CHANNELS } from "../../ipc/channels.ts";
import { reportService } from "./report.service.ts";

const { ipcMain } = require("electron/main") as typeof import("electron");

export const registerReportHandlers = () => {
  ipcMain.handle(
    CHANNELS.LOAD_OVERDUE_REPORT,
    async (_event: IpcMainInvokeEvent, input: OverdueReportInput) => {
      return reportService.loadOverdueReport(input);
    },
  );

  ipcMain.handle(
    CHANNELS.LOAD_DAILY_REPORT,
    async (_event: IpcMainInvokeEvent, input: ReportDateRangeInput) => {
      return reportService.loadDailyReport(input);
    },
  );

  ipcMain.handle(
    CHANNELS.LOAD_BUYBACK_REPORT,
    async (_event: IpcMainInvokeEvent, input: ReportDateRangeInput) => {
      return reportService.loadBuybackReport(input);
    },
  );

  ipcMain.handle(
    CHANNELS.LOAD_INTEREST_REPORT,
    async (_event: IpcMainInvokeEvent, input: ReportDateRangeInput) => {
      return reportService.loadInterestReport(input);
    },
  );
};
