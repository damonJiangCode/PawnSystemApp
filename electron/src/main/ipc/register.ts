import { registerEmployeeHandlers } from "../modules/employees/employee.handlers.ts";
import { registerItemHandlers } from "../modules/items/item.handlers.ts";
import { registerReportHandlers } from "../modules/reports/report.handlers.ts";
import { registerTicketHandlers } from "../modules/tickets/ticket.handlers.ts";
import { registerWindowHandlers } from "../window/window.handlers.ts";
import { registerXmlReportHandlers } from "../modules/xml-reports/xml-report.handlers.ts";

export const registerHandlers = () => {
  registerEmployeeHandlers();
  registerTicketHandlers();
  registerReportHandlers();
  registerItemHandlers();
  registerWindowHandlers();
  registerXmlReportHandlers();
};
