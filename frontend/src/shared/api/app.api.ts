import type { AppApi } from "../../../../shared/api-contracts/appApi.contract.ts";
import type { ItemApi } from "../../../../shared/api-contracts/itemApi.contract.ts";
import { createClientHttpApi } from "./client.http.ts";
import { createEmployeeHttpApi } from "./employee.http.ts";
import { createItemHttpApi, type HttpItemMethods } from "./item.http.ts";
import { createReferenceHttpApi } from "./reference.http.ts";
import { createTicketHttpApi } from "./ticket.http.ts";

// Domains served by the HTTP backend; the preload bridge provides the rest.
type HttpDomains = "client" | "employee" | "reference" | "ticket";
// Items are moving one method at a time, so that domain is split for now.
type DesktopApi = Omit<AppApi, HttpDomains | "item"> & {
  item: Omit<ItemApi, HttpItemMethods>;
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
  ticket: createTicketHttpApi(),
};
const itemHttpApi = createItemHttpApi();

export const getAppApi = (): AppApi | undefined => {
  const desktop = window.appAPI;
  if (!desktop) return undefined;
  return { ...desktop, ...httpApi, item: { ...desktop.item, ...itemHttpApi } };
};
