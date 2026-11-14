import type { XmlReportApi } from "../../../../shared/api-contracts/xmlReportApi.contract.ts";
import type { ReportDateRangeInput } from "../../../../shared/payload-contracts/ticket.contract.ts";
import type {
  XmlReportConnectionResult,
  XmlReportPreviewResult,
  XmlReportSubmissionResult,
} from "../../../../shared/payload-contracts/xmlReport.contract.ts";
import { API_BASE_URL, apiUrl, jsonBody, requestJson } from "./http.ts";

// The server talks to LeadsOnline, which can take up to 30 seconds per request
// (one per ticket when submitting), so these calls wait longer than usual.
const CONNECTION_TIMEOUT_MS = 70_000;
const SUBMIT_TIMEOUT_MS = 10 * 60_000;

// The server holds the LeadsOnline login and applies every rule.
export function checkXmlReportConnectionHttp(baseUrl = API_BASE_URL) {
  return requestJson<XmlReportConnectionResult>(
    apiUrl("/xml-reports/connection", baseUrl),
    { signal: AbortSignal.timeout(CONNECTION_TIMEOUT_MS) },
  );
}

export function loadXmlReportPreviewHttp(
  input: ReportDateRangeInput,
  baseUrl = API_BASE_URL,
) {
  const url = apiUrl("/xml-reports/preview", baseUrl);
  url.searchParams.set("from_date", input.from_date);
  url.searchParams.set("to_date", input.to_date);
  return requestJson<XmlReportPreviewResult>(url);
}

export function submitXmlReportHttp(
  input: ReportDateRangeInput,
  baseUrl = API_BASE_URL,
) {
  return requestJson<XmlReportSubmissionResult>(
    apiUrl("/xml-reports/submit", baseUrl),
    {
      ...jsonBody("POST", input),
      signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
    },
  );
}

export const createXmlReportHttpApi = (
  baseUrl = API_BASE_URL,
): XmlReportApi => ({
  checkConnection: () => checkXmlReportConnectionHttp(baseUrl),
  loadPreview: (input) => loadXmlReportPreviewHttp(input, baseUrl),
  submitReport: (input) => submitXmlReportHttp(input, baseUrl),
});
