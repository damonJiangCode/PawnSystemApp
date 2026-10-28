import type { ClientApi } from "../../../../shared/api-contracts/clientApi.contract.ts";
import type { Client } from "../../../../shared/models/client.model.ts";
import type {
  CreateClientInput,
  UpdateClientInput,
} from "../../../../shared/payload-contracts/client.contract.ts";
import { formatIsoDate } from "../utils/formatters.ts";
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
    date_of_birth: formatIsoDate(source.date_of_birth),
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
  const result = await requestJson<Client>(apiUrl(`/client`, baseUrl), {
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
    if (value !== undefined)
      client[field] =
        field === "date_of_birth" ? formatIsoDate(value as Date) : value;
  }
  const result = await requestJson<Client>(
    apiUrl(`/client/${input.client.client_number}`, baseUrl),
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
  const url = apiUrl(`/client`, baseUrl);
  url.search = new URLSearchParams({ firstName, lastName }).toString();

  return requestClients(url);
}

export async function searchClientsByDobHttp(
  dateOfBirth: string,
  baseUrl = API_BASE_URL,
): Promise<Client[]> {
  const url = apiUrl(`/client/by-dob`, baseUrl);
  url.search = new URLSearchParams({ dateOfBirth }).toString();
  return requestClients(url);
}

// HTTP response handling is shared by both client searches.
async function requestClients(url: URL): Promise<Client[]> {
  const clients = await requestJson<Client[]>(url);
  return clients.map(restoreClientDates);
}

function restoreClientDates(client: Client): Client {
  return {
    ...client,
    date_of_birth: new Date(client.date_of_birth),
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

export const createClientHttpApi = (baseUrl = API_BASE_URL): ClientApi => ({
  searchClients: (firstName, lastName) =>
    searchClientsHttp(firstName, lastName, baseUrl),
  searchClientsByDob: (dateOfBirth) =>
    searchClientsByDobHttp(dateOfBirth, baseUrl),
  createClient: (input) => createClientHttp(input, baseUrl),
  updateClient: (input) => updateClientHttp(input, baseUrl),
  setHoldUntil: (clientNumber, holdUntil, employeePassword) =>
    updateClientHttp(
      {
        client: { client_number: clientNumber, hold_until: holdUntil },
        ...(holdUntil !== null ? { employee_password: employeePassword } : {}),
      },
      baseUrl,
    ),
});
