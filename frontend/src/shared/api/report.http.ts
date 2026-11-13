import type { ReportApi } from "../../../../shared/api-contracts/reportApi.contract.ts";
import type {
  BuybackReportResult,
  DailyReportResult,
  InterestReportResult,
  OverdueReportInput,
  OverdueReportResult,
  ReportDateRangeInput,
} from "../../../../shared/payload-contracts/ticket.contract.ts";
import { API_BASE_URL, apiUrl, requestJson } from "./http.ts";

// JSON carries instants as ISO strings; the contracts use Date.
type BuybackResponse = Omit<BuybackReportResult, "rows"> & {
  rows: (Omit<BuybackReportResult["rows"][number], "pickup_datetime"> & {
    pickup_datetime: string;
  })[];
};
type InterestResponse = Omit<InterestReportResult, "rows"> & {
  rows: (Omit<InterestReportResult["rows"][number], "payment_datetime"> & {
    payment_datetime: string;
  })[];
};

// The server trims, validates and applies every report rule.
const reportUrl = (
  report: string,
  query: ReportDateRangeInput | OverdueReportInput,
  baseUrl: string,
) => {
  const url = apiUrl(`/reports/${report}`, baseUrl);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url;
};

export function loadDailyReportHttp(
  input: ReportDateRangeInput,
  baseUrl = API_BASE_URL,
) {
  return requestJson<DailyReportResult>(reportUrl("daily", input, baseUrl));
}

export async function loadBuybackReportHttp(
  input: ReportDateRangeInput,
  baseUrl = API_BASE_URL,
): Promise<BuybackReportResult> {
  const report = await requestJson<BuybackResponse>(
    reportUrl("buyback", input, baseUrl),
  );
  return {
    ...report,
    rows: report.rows.map((row) => ({
      ...row,
      pickup_datetime: new Date(row.pickup_datetime),
    })),
  };
}

export async function loadInterestReportHttp(
  input: ReportDateRangeInput,
  baseUrl = API_BASE_URL,
): Promise<InterestReportResult> {
  const report = await requestJson<InterestResponse>(
    reportUrl("interest", input, baseUrl),
  );
  return {
    ...report,
    rows: report.rows.map((row) => ({
      ...row,
      payment_datetime: new Date(row.payment_datetime),
    })),
  };
}

export function loadOverdueReportHttp(
  input: OverdueReportInput,
  baseUrl = API_BASE_URL,
) {
  return requestJson<OverdueReportResult>(reportUrl("overdue", input, baseUrl));
}

export const createReportHttpApi = (baseUrl = API_BASE_URL): ReportApi => ({
  loadDailyReport: (input) => loadDailyReportHttp(input, baseUrl),
  loadBuybackReport: (input) => loadBuybackReportHttp(input, baseUrl),
  loadInterestReport: (input) => loadInterestReportHttp(input, baseUrl),
  loadOverdueReport: (input) => loadOverdueReportHttp(input, baseUrl),
});
