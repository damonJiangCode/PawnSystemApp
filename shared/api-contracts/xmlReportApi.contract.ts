import type {
  XmlReportConnectionResult,
  XmlReportPreviewResult,
  XmlReportSubmissionResult,
} from "../payload-contracts/xmlReport.contract.ts";
import type { ReportDateRangeInput } from "../payload-contracts/ticket.contract.ts";

export type XmlReportApi = {
  checkConnection: () => Promise<XmlReportConnectionResult>;
  loadPreview: (input: ReportDateRangeInput) => Promise<XmlReportPreviewResult>;
  submitReport: (
    input: ReportDateRangeInput,
  ) => Promise<XmlReportSubmissionResult>;
};
