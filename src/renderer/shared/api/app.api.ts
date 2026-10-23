import type { AppApi } from "../../../shared/api-contracts/appApi.contract";
import {
  searchClientsHttp,
  searchClientsByDobHttp,
  createClientHttp,
  updateClientHttp,
} from "./client.http.ts";

type DesktopApi = Omit<AppApi, "client"> & {
  client: Omit<
    AppApi["client"],
    | "searchClients"
    | "searchClientsByDob"
    | "createClient"
    | "updateClient"
    | "setHoldUntil"
  >;
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
      setHoldUntil: (clientNumber, holdUntil, employeePassword) =>
        updateClientHttp(
          {
            client: { client_number: clientNumber, hold_until: holdUntil },
            ...(holdUntil !== null
              ? { employee_password: employeePassword }
              : {}),
          },
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      createClient: (input) =>
        createClientHttp(
          input,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      updateClient: (input) =>
        updateClientHttp(
          input,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      searchClientsByDob: (dateOfBirth) =>
        searchClientsByDobHttp(
          dateOfBirth,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      searchClients: (firstName, lastName) =>
        searchClientsHttp(
          firstName,
          lastName,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
    },
  };
};
