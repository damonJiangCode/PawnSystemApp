import type { AppApi } from "../../../shared/api-contracts/appApi.contract";
import {
  searchClientsHttp,
  searchClientsByDobHttp,
  createClientHttp,
  updateClientHttp,
  loadClientReferenceHttp,
  loadColorsForAdminHttp,
  addClientColorHttp,
  setClientColorActiveHttp,
} from "./client.http.ts";

type DesktopApi = Omit<AppApi, "client">;

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
      loadHairColorsForAdmin: () =>
        loadColorsForAdminHttp(
          "hair",
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      addHairColor: (color) =>
        addClientColorHttp(
          "hair",
          color,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      activateHairColor: (color) =>
        setClientColorActiveHttp(
          "hair",
          color,
          true,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      deactivateHairColor: (color) =>
        setClientColorActiveHttp(
          "hair",
          color,
          false,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      loadEyeColorsForAdmin: () =>
        loadColorsForAdminHttp(
          "eye",
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      addEyeColor: (color) =>
        addClientColorHttp(
          "eye",
          color,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      activateEyeColor: (color) =>
        setClientColorActiveHttp(
          "eye",
          color,
          true,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      deactivateEyeColor: (color) =>
        setClientColorActiveHttp(
          "eye",
          color,
          false,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),

      loadCities: () =>
        loadClientReferenceHttp(
          "cities",
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      loadIdTypes: () =>
        loadClientReferenceHttp(
          "id-types",
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      loadHairColors: () =>
        loadClientReferenceHttp(
          "hair-colors",
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      loadEyeColors: () =>
        loadClientReferenceHttp(
          "eye-colors",
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
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
