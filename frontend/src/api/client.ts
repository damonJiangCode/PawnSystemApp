import type { Client } from "@pawnsystem/shared/models/client.model.ts";
import type {
  ClientNotesAction,
  CreateClientInput,
  SaveClientInput,
  UpdateClientInput,
} from "@pawnsystem/shared/payload-contracts/client.contract.ts";
import { extractBackendFieldError } from "../lib/formError";
import { API_BASE_URL, apiUrl, requestJson } from "./http.ts";

export async function createClientHttp(
  input: CreateClientInput,
  baseUrl = API_BASE_URL,
): Promise<Client> {
  const source = input.client;
  // Only editable fields cross the write boundary; IDs, statistics and timestamps are server-owned.
  const client = {
    first_name: source.first_name,
    last_name: source.last_name,
    middle_name: source.middle_name,
    date_of_birth: source.date_of_birth,
    gender: source.gender,
    hair_color: source.hair_color,
    eye_color: source.eye_color,
    height_cm: source.height_cm,
    weight_kg: source.weight_kg,
    address: source.address,
    postal_code: source.postal_code,
    city: source.city,
    province: source.province,
    country: source.country,
    email: source.email,
    phone: source.phone,
    notes: source.notes,
    pickup_self_only: source.pickup_self_only,
  };
  const result = await requestJson<Client>(apiUrl(`/clients`, baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client,
      identifications: input.identifications.map((id) => ({
        id_type: id.id_type,
        id_value: id.id_value,
      })),
      employee_password: input.employee_password,
      notes_action: input.notes_action,
      photo: input.photo,
    }),
  });
  return restoreClientDates(result);
}

export async function updateClientHttp(
  input: UpdateClientInput,
  baseUrl = API_BASE_URL,
): Promise<Client> {
  const client: Record<string, unknown> = {};
  const fields = [
    "first_name",
    "last_name",
    "middle_name",
    "date_of_birth",
    "gender",
    "hair_color",
    "eye_color",
    "height_cm",
    "weight_kg",
    "address",
    "postal_code",
    "city",
    "province",
    "country",
    "email",
    "phone",
    "notes",
    "pickup_self_only",
    "is_active",
    "hold_until",
  ] as const;
  for (const field of fields) {
    const value = input.client[field];
    if (value !== undefined) client[field] = value;
  }
  const result = await requestJson<Client>(
    apiUrl(`/clients/${input.client.client_number}`, baseUrl),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client,
        identifications: input.identifications?.map((id) => ({
          id_type: id.id_type,
          id_value: id.id_value,
        })),
        photo: input.photo,
        employee_password: input.employee_password,
        notes_action: input.notes_action,
      }),
    },
  );
  return restoreClientDates(result);
}

export async function searchClientsHttp(
  firstName: string,
  lastName: string,
  baseUrl = API_BASE_URL,
): Promise<Client[]> {
  const url = apiUrl(`/clients`, baseUrl);
  url.search = new URLSearchParams({ firstName, lastName }).toString();

  return requestClients(url);
}

export async function searchClientsByDobHttp(
  dateOfBirth: string,
  baseUrl = API_BASE_URL,
): Promise<Client[]> {
  const url = apiUrl(`/clients/by-dob`, baseUrl);
  url.search = new URLSearchParams({ dateOfBirth }).toString();
  return requestClients(url);
}

// HTTP response handling is shared by both client searches.
async function requestClients(url: URL): Promise<Client[]> {
  const clients = await requestJson<Client[]>(url);
  return clients.map(restoreClientDates);
}

export function restoreClientDates(client: Client): Client {
  return {
    ...client,
    updated_at: new Date(client.updated_at),
    image_updated_at: client.image_updated_at
      ? new Date(client.image_updated_at)
      : null,
    identifications: client.identifications?.map((id) => ({
      ...id,
      updated_at: id.updated_at ? new Date(id.updated_at) : undefined,
    })),
  };
}

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
  setHoldUntil: (
    clientNumber: number,
    holdUntil: string | null,
    employeePassword?: string,
  ): Promise<Client> =>
    updateClientHttp({
      client: { client_number: clientNumber, hold_until: holdUntil },
      ...(holdUntil !== null ? { employee_password: employeePassword } : {}),
    }),

  searchClients: async (
    firstName: string,
    lastName: string,
  ): Promise<Client[]> => {
    const normalizedFirstName = normalizeSearchInput(firstName);
    const normalizedLastName = normalizeSearchInput(lastName);
    if (!normalizedFirstName && !normalizedLastName) return [];
    return searchClientsHttp(normalizedFirstName, normalizedLastName);
  },

  searchClientsByDob: async (dateOfBirth: string): Promise<Client[]> => {
    const normalizedDob = normalizeSearchInput(dateOfBirth);
    if (!normalizedDob) return [];
    return searchClientsByDobHttp(normalizedDob);
  },

  createClient: async (input: CreateClientInput): Promise<Client> => {
    try {
      return await createClientHttp({
        ...normalizeSaveClientInput(input),
        photo: input.photo,
      });
    } catch (error) {
      throw mapBackendError(error);
    }
  },

  updateClient: async (input: UpdateClientInput): Promise<Client> => {
    try {
      return await updateClientHttp(input);
    } catch (error) {
      throw mapBackendError(error);
    }
  },
};

export type { ClientNotesAction, SaveClientInput };
