import { registerItemHandlers } from "../modules/items/item.handlers.ts";
import { registerReportHandlers } from "../modules/reports/report.handlers.ts";
import { registerTicketHandlers } from "../modules/tickets/ticket.handlers.ts";
import { registerWindowHandlers } from "../window/window.handlers.ts";
import { registerXmlReportHandlers } from "../modules/xml-reports/xml-report.handlers.ts";

export const registerHandlers = () => {
  registerTicketHandlers();
  registerReportHandlers();
  registerItemHandlers();
  registerWindowHandlers();
  registerXmlReportHandlers();
};
