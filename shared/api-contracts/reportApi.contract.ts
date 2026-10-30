import type {
  BuybackReportResult,
  DailyReportResult,
  InterestReportResult,
  OverdueReportInput,
  OverdueReportResult,
  ReportDateRangeInput,
} from "../payload-contracts/ticket.contract.ts";

// Still served by the Electron preload bridge until reports are migrated.
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
