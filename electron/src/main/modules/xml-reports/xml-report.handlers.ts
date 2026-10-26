import type { IpcMainInvokeEvent } from "electron";
import type { ReportDateRangeInput } from "../../../../../shared/payload-contracts/ticket.contract.ts";
import { CHANNELS } from "../../ipc/channels.ts";
import { xmlReportService } from "./xml-report.service.ts";

const { ipcMain } = require("electron/main") as typeof import("electron");

export const registerXmlReportHandlers = () => {
  ipcMain.handle(CHANNELS.CHECK_XML_REPORT_CONNECTION, () =>
    xmlReportService.checkConnection(),
  );

  ipcMain.handle(
    CHANNELS.LOAD_XML_REPORT_PREVIEW,
    (_event: IpcMainInvokeEvent, input: ReportDateRangeInput) =>
      xmlReportService.loadPreview(input),
  );

  ipcMain.handle(
    CHANNELS.SUBMIT_XML_REPORT,
    (_event: IpcMainInvokeEvent, input: ReportDateRangeInput) =>
      xmlReportService.submitReport(input),
  );
};
