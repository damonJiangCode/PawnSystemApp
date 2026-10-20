import type { AppApi } from "../../../shared/api-contracts/appApi.contract";
import { searchClientsHttp, searchClientsByDobHttp } from "./client.http.ts";

type DesktopApi = Omit<AppApi, "client"> & {
  client: Omit<AppApi["client"], "searchClients" | "searchClientsByDob">;
};

declare global {
  interface Window {
    appAPI?: DesktopApi;
  }
}

export const getAppApi = (): AppApi | undefined => {
  const desktop = window.appAPI;
  if (!desktop) return undefined;
  return {
    ...desktop,
    client: {
      ...desktop.client,
      searchClientsByDob: dateOfBirth => searchClientsByDobHttp(
        dateOfBirth,
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
      ),
      searchClients: (firstName, lastName) => searchClientsHttp(
        firstName,
        lastName,
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
      ),
    },
  };
};
