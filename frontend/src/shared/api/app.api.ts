import type { AppApi } from "../../../../shared/api-contracts/appApi.contract.ts";
import type { TicketApi } from "../../../../shared/api-contracts/ticketApi.contract.ts";
import { createClientHttpApi } from "./client.http.ts";
import { createEmployeeHttpApi } from "./employee.http.ts";
import { createReferenceHttpApi } from "./reference.http.ts";
import { createTicketHttpApi, type HttpTicketMethods } from "./ticket.http.ts";

// Domains served by the HTTP backend; the preload bridge provides the rest.
type HttpDomains = "client" | "employee" | "reference";
// Tickets migrate slice by slice: HTTP methods override the bridge's.
type DesktopApi = Omit<AppApi, HttpDomains | "ticket"> & {
  ticket: Omit<TicketApi, HttpTicketMethods>;
};

declare global {
  interface Window {
    appAPI?: DesktopApi;
  }
}

const httpApi: Pick<AppApi, HttpDomains> = {
  client: createClientHttpApi(),
  employee: createEmployeeHttpApi(),
  reference: createReferenceHttpApi(),
};
const httpTicketApi = createTicketHttpApi();

export const getAppApi = (): AppApi | undefined => {
  const desktop = window.appAPI;
  if (!desktop) return undefined;
  return {
    ...desktop,
    ...httpApi,
    ticket: { ...desktop.ticket, ...httpTicketApi },
  };
};
