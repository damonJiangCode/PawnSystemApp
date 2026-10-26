import type { ClientApi } from "./clientApi.contract.ts";
import type { EmployeeApi } from "./employeeApi.contract.ts";
import type { ItemApi } from "./itemApi.contract.ts";
import type { TicketApi } from "./ticketApi.contract.ts";
import type { WindowApi } from "./windowApi.contract.ts";
import type { XmlReportApi } from "./xmlReportApi.contract.ts";

export type AppApi = {
  client: ClientApi;
  employee: EmployeeApi;
  ticket: TicketApi;
  item: ItemApi;
  window: WindowApi;
  xmlReport: XmlReportApi;
};
