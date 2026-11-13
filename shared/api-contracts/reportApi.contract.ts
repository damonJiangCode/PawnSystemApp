import type {
  BuybackReportResult,
  DailyReportResult,
  InterestReportResult,
  OverdueReportInput,
  OverdueReportResult,
  ReportDateRangeInput,
} from "../payload-contracts/ticket.contract.ts";

// Served by the HTTP backend (GET /reports/*).
export type ReportApi = {
  loadBuybackReport: (
    input: ReportDateRangeInput,
  ) => Promise<BuybackReportResult>;
  loadDailyReport: (input: ReportDateRangeInput) => Promise<DailyReportResult>;
  loadInterestReport: (
    input: ReportDateRangeInput,
  ) => Promise<InterestReportResult>;
  loadOverdueReport: (
    input: OverdueReportInput,
  ) => Promise<OverdueReportResult>;
};
