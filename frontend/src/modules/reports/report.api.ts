import type { ReportApi } from "../../../../shared/api-contracts/reportApi.contract";
import { getAppApi } from "../../shared/api/app.api";

const api = (): ReportApi => {
  const report = getAppApi()?.report;
  if (!report) throw new Error("Report API is unavailable.");
  return report;
};

// The server trims, validates and applies every report rule.
export const reportApi: ReportApi = {
  loadBuybackReport: (input) => api().loadBuybackReport(input),
  loadInterestReport: (input) => api().loadInterestReport(input),
  loadDailyReport: (input) => api().loadDailyReport(input),
  loadOverdueReport: (input) => api().loadOverdueReport(input),
};
