import type { AppApi } from "../../../../shared/api-contracts/appApi.contract";
import {
  loadAllIdTypesHttp,
  addIdTypeHttp,
  setIdTypeActiveHttp,
  loadHolidayDatesHttp,
  addHolidayDateHttp,
  deleteHolidayDateHttp,
  loadLocationsHttp,
  loadAllLocationsHttp,
  addLocationHttp,
  setLocationActiveHttp,
  searchClientsHttp,
  searchClientsByDobHttp,
  createClientHttp,
  updateClientHttp,
  loadClientReferenceHttp,
  loadAllColorsHttp,
  addClientColorHttp,
  setClientColorActiveHttp,
} from "./client.http.ts";

type ReferenceTicketMethods =
  | "loadHolidayDates"
  | "addHolidayDate"
  | "deleteHolidayDate"
  | "loadLocations"
  | "loadAllLocations"
  | "addLocation"
  | "deactivateLocation"
  | "activateLocation";
type DesktopApi = Omit<AppApi, "client" | "ticket"> & {
  ticket: Omit<AppApi["ticket"], ReferenceTicketMethods>;
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
    ticket: {
      ...desktop.ticket,
      loadHolidayDates: () =>
        loadHolidayDatesHttp(
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      addHolidayDate: (input) =>
        addHolidayDateHttp(
          input,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      deleteHolidayDate: (holidayDate) =>
        deleteHolidayDateHttp(
          holidayDate,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      loadLocations: () =>
        loadLocationsHttp(
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      loadAllLocations: () =>
        loadAllLocationsHttp(
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      addLocation: (input) =>
        addLocationHttp(
          input,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      activateLocation: (location) =>
        setLocationActiveHttp(
          location,
          true,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      deactivateLocation: (location) =>
        setLocationActiveHttp(
          location,
          false,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
    },
    client: {
      loadAllIdTypes: () =>
        loadAllIdTypesHttp(
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      addIdType: (type) =>
        addIdTypeHttp(
          type,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      activateIdType: (type) =>
        setIdTypeActiveHttp(
          type,
          true,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      deactivateIdType: (type) =>
        setIdTypeActiveHttp(
          type,
          false,
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
        ),
      loadAllHairColors: () =>
        loadAllColorsHttp(
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
      loadAllEyeColors: () =>
        loadAllColorsHttp(
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
