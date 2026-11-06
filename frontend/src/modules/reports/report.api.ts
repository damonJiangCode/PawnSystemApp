import type { ReportApi } from "../../../../shared/api-contracts/reportApi.contract";
import type {
  OverdueReportInput,
  ReportDateRangeInput,
} from "../../../../shared/payload-contracts/ticket.contract";
import { getAppApi } from "../../shared/api/app.api";

const api = (): ReportApi => {
  const report = getAppApi()?.report;
  if (!report) throw new Error("Report API is unavailable.");
  return report;
};

const dateRange = (input: ReportDateRangeInput): ReportDateRangeInput => ({
  from_date: input.from_date.trim(),
  to_date: input.to_date.trim(),
});

// Reports still run in Electron main until their migration.
export const reportApi = {
  loadBuybackReport: (input: ReportDateRangeInput) =>
    api().loadBuybackReport(dateRange(input)),
  loadInterestReport: (input: ReportDateRangeInput) =>
    api().loadInterestReport(dateRange(input)),
  loadDailyReport: (input: ReportDateRangeInput) =>
    api().loadDailyReport(dateRange(input)),
  loadOverdueReport: (input: OverdueReportInput) =>
    api().loadOverdueReport({
      due_on_or_before: input.due_on_or_before.trim(),
      location_from: input.location_from.trim().toUpperCase(),
      location_to: input.location_to.trim().toUpperCase(),
    }),
};
