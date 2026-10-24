import type { Client } from "../../../shared/models/client.model";
import type { HairColor } from "../../../shared/models/hair-color.model";
import type { EyeColor } from "../../../shared/models/eye-color.model";
import type {
  CitiesResponse,
  ClientNotesAction,
  SaveClientInput,
  CreateClientInput,
  UpdateClientInput,
} from "../../../shared/payload-contracts/client.contract";
import { getAppApi } from "../../shared/api/app.api";
import { extractBackendFieldError } from "../../shared/utils/formError";

export type ClientFormField = "employee_password";

export type ClientFormError = Error & {
  field?: ClientFormField;
};

const normalizeSearchInput = (value?: string) => value?.trim() ?? "";
const normalizeNameInput = (value?: string) =>
  value?.trim().toUpperCase() ?? "";

const createFieldError = (
  field: ClientFormField,
  message: string,
): ClientFormError => {
  const error = new Error(message) as ClientFormError;
  error.field = field;
  return error;
};

const mapBackendError = (error: unknown): Error => {
  if (!(error instanceof Error)) {
    return new Error("Unknown client error");
  }

  const backendFieldError = extractBackendFieldError(error.message);

  if (!backendFieldError) {
    return error;
  }

  return createFieldError(
    backendFieldError.field as ClientFormField,
    backendFieldError.message,
  );
};

const normalizeSaveClientInput = (input: SaveClientInput): SaveClientInput => ({
  client: {
    ...input.client,
    first_name: normalizeNameInput(input.client.first_name),
    last_name: normalizeNameInput(input.client.last_name),
    middle_name: normalizeNameInput(input.client.middle_name),
    gender: input.client.gender?.trim().toUpperCase() ?? "",
    hair_color: input.client.hair_color?.trim().toUpperCase() ?? "",
    eye_color: input.client.eye_color?.trim().toUpperCase() ?? "",
    address: input.client.address?.trim() ?? "",
    postal_code: input.client.postal_code?.trim() ?? "",
    city: input.client.city?.trim() ?? "",
    province: input.client.province?.trim() ?? "",
    country: input.client.country?.trim() ?? "",
    email: input.client.email?.trim() ?? "",
    phone: input.client.phone?.trim() ?? "",
    notes: input.client.notes?.trim() ?? "",
    image_path: input.client.image_path?.trim() ?? "",
  },
  identifications: (input.identifications ?? []).map((id) => ({
    ...id,
    id_type: id.id_type?.trim() ?? "",
    id_value: id.id_value?.trim() ?? "",
  })),
  employee_password: input.employee_password?.trim() ?? "",
  notes_action: input.notes_action ?? "keep",
});

export const clientApi = {
  setHoldUntil: async (
    clientNumber: number,
    holdUntil: string | null,
    employeePassword?: string,
  ): Promise<Client> => {
    const api = getAppApi()?.client;
    if (!api) throw new Error("Client API is unavailable.");
    return api.setHoldUntil(clientNumber, holdUntil, employeePassword);
  },
  searchClients: async (
    firstName: string,
    lastName: string,
  ): Promise<Client[]> => {
    const normalizedFirstName = normalizeSearchInput(firstName);
    const normalizedLastName = normalizeSearchInput(lastName);

    if (!normalizedFirstName && !normalizedLastName) {
      return [];
    }

    const api = getAppApi()?.client;
    if (!api) {
      throw new Error("Client API is unavailable.");
    }

    return api.searchClients(normalizedFirstName, normalizedLastName);
  },

  searchClientsByDob: async (dateOfBirth: string): Promise<Client[]> => {
    const normalizedDob = normalizeSearchInput(dateOfBirth);

    if (!normalizedDob) {
      return [];
    }

    const api = getAppApi()?.client;
    if (!api) {
      throw new Error("Client API is unavailable.");
    }

    return api.searchClientsByDob(normalizedDob);
  },

  loadCities: async (): Promise<CitiesResponse> => {
    const api = getAppApi()?.client;
    if (!api) {
      throw new Error("Client API is unavailable.");
    }

    return api.loadCities();
  },

  loadHairColors: async (): Promise<string[]> => {
    const api = getAppApi()?.client;
    if (!api) {
      throw new Error("Client API is unavailable.");
    }

    return api.loadHairColors();
  },

  loadHairColorsForAdmin: async (): Promise<HairColor[]> => {
    const api = getAppApi()?.client;

    if (!api) {
      throw new Error("Hair color API is unavailable.");
    }

    return api.loadHairColorsForAdmin();
  },

  addHairColor: async (color: string): Promise<string> => {
    const api = getAppApi()?.client;

    if (!api) {
      throw new Error("Hair color API is unavailable.");
    }

    return api.addHairColor(color.trim().toUpperCase());
  },

  deactivateHairColor: async (color: string): Promise<HairColor> => {
    const api = getAppApi()?.client;

    if (!api) {
      throw new Error("Hair color API is unavailable.");
    }

    return api.deactivateHairColor(color.trim().toUpperCase());
  },

  activateHairColor: async (color: string): Promise<HairColor> => {
    const api = getAppApi()?.client;

    if (!api) {
      throw new Error("Hair color API is unavailable.");
    }

    return api.activateHairColor(color.trim().toUpperCase());
  },

  loadEyeColors: async (): Promise<string[]> => {
    const api = getAppApi()?.client;
    if (!api) {
      throw new Error("Client API is unavailable.");
    }

    return api.loadEyeColors();
  },

  loadEyeColorsForAdmin: async (): Promise<EyeColor[]> => {
    const api = getAppApi()?.client;

    if (!api) {
      throw new Error("Eye color API is unavailable.");
    }

    return api.loadEyeColorsForAdmin();
  },

  addEyeColor: async (color: string): Promise<string> => {
    const api = getAppApi()?.client;

    if (!api) {
      throw new Error("Eye color API is unavailable.");
    }

    return api.addEyeColor(color.trim().toUpperCase());
  },

  deactivateEyeColor: async (color: string): Promise<EyeColor> => {
    const api = getAppApi()?.client;

    if (!api) {
      throw new Error("Eye color API is unavailable.");
    }

    return api.deactivateEyeColor(color.trim().toUpperCase());
  },

  activateEyeColor: async (color: string): Promise<EyeColor> => {
    const api = getAppApi()?.client;

    if (!api) {
      throw new Error("Eye color API is unavailable.");
    }

    return api.activateEyeColor(color.trim().toUpperCase());
  },

  loadIdTypes: async (): Promise<string[]> => {
    const api = getAppApi()?.client;
    if (!api) {
      throw new Error("Client API is unavailable.");
    }

    return api.loadIdTypes();
  },

  createClient: async (input: CreateClientInput): Promise<Client> => {
    const api = getAppApi()?.client;
    if (!api) {
      throw new Error("createClient is not available");
    }

    try {
      return await api.createClient({
        ...normalizeSaveClientInput(input),
        photo: input.photo,
      });
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  updateClient: async (input: UpdateClientInput): Promise<Client> => {
    const api = getAppApi()?.client;
    if (!api) {
      throw new Error("updateClient is not available");
    }

    try {
      return await api.updateClient(input);
    } catch (error) {
      throw mapBackendError(error);
    }
  },
};

export type { CitiesResponse, ClientNotesAction, SaveClientInput };
