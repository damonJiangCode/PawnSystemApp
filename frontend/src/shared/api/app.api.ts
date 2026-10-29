import type { AppApi } from "../../../../shared/api-contracts/appApi.contract.ts";
import { createClientHttpApi } from "./client.http.ts";
import { createEmployeeHttpApi } from "./employee.http.ts";
import { createReferenceHttpApi } from "./reference.http.ts";

// Domains served by the HTTP backend; the preload bridge provides the rest.
type HttpDomains = "client" | "employee" | "reference";
type DesktopApi = Omit<AppApi, HttpDomains>;

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

export const getAppApi = (): AppApi | undefined => {
  const desktop = window.appAPI;
  if (!desktop) return undefined;
  return { ...desktop, ...httpApi };
};
