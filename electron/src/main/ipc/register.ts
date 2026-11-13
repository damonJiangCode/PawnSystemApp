import { registerWindowHandlers } from "../window/window.handlers.ts";
import { registerXmlReportHandlers } from "../modules/xml-reports/xml-report.handlers.ts";

export const registerHandlers = () => {
  registerWindowHandlers();
  registerXmlReportHandlers();
};
