import type { Location } from "../../../../shared/models/location.model.ts";
import type { HolidayDate } from "../../../../shared/models/holiday-date.model.ts";
import type { SaveHolidayInput } from "../../../../shared/payload-contracts/ticket.contract.ts";
import type { SaveLocationInput } from "../../../../shared/payload-contracts/ticket.contract.ts";
import type { Client } from "../../../../shared/models/client.model.ts";
import type {
  CreateClientInput,
  UpdateClientInput,
  CitiesResponse,
} from "../../../../shared/payload-contracts/client.contract.ts";
import { formatIsoDate } from "../utils/formatters.ts";
import type { HairColor } from "../../../../shared/models/hair-color.model.ts";
import type { EyeColor } from "../../../../shared/models/eye-color.model.ts";

export async function loadHolidayDatesHttp(
  baseUrl = "http://localhost:3000",
): Promise<HolidayDate[]> {
  return requestJson(
    new URL(`${baseUrl.replace(/\/$/, "")}/client/reference/holidays`),
  );
}

export async function addHolidayDateHttp(
  input: SaveHolidayInput,
  baseUrl = "http://localhost:3000",
): Promise<HolidayDate> {
  return requestJson(
    new URL(`${baseUrl.replace(/\/$/, "")}/client/reference/holidays`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        holiday_date: input.holiday_date,
        name: input.name,
      }),
    },
  );
}

export async function deleteHolidayDateHttp(
  holidayDate: string,
  baseUrl = "http://localhost:3000",
): Promise<HolidayDate> {
  return requestJson(
    new URL(
      `${baseUrl.replace(/\/$/, "")}/client/reference/holidays/${encodeURIComponent(holidayDate)}`,
    ),
    { method: "DELETE" },
  );
}

export async function loadLocationsHttp(
  baseUrl = "http://localhost:3000",
): Promise<string[]> {
  return requestJson(
    new URL(`${baseUrl.replace(/\/$/, "")}/client/reference/locations`),
  );
}

export async function loadAllLocationsHttp(
  baseUrl = "http://localhost:3000",
): Promise<Location[]> {
  return requestJson(
    new URL(`${baseUrl.replace(/\/$/, "")}/client/reference/locations/all`),
  );
}

export async function addLocationHttp(
  input: SaveLocationInput,
  baseUrl = "http://localhost:3000",
): Promise<Location> {
  return requestJson(
    new URL(`${baseUrl.replace(/\/$/, "")}/client/reference/locations`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: input.location,
        description: input.description,
      }),
    },
  );
}

export async function setLocationActiveHttp(
  location: string,
  isActive: boolean,
  baseUrl = "http://localhost:3000",
): Promise<Location> {
  return requestJson(
    new URL(
      `${baseUrl.replace(/\/$/, "")}/client/reference/locations/${isActive ? "activate" : "deactivate"}`,
    ),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location }),
    },
  );
}

export async function loadAllColorsHttp(
  kind: "hair" | "eye",
  baseUrl = "http://localhost:3000",
): Promise<(HairColor | EyeColor)[]> {
  return requestJson(
    new URL(
      `${baseUrl.replace(/\/$/, "")}/client/reference/${kind}-colors/all`,
    ),
  );
}

export async function addClientColorHttp(
  kind: "hair" | "eye",
  color: string,
  baseUrl = "http://localhost:3000",
): Promise<string> {
  const result = await requestJson<{ color: string }>(
    new URL(`${baseUrl.replace(/\/$/, "")}/client/reference/${kind}-colors`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    },
  );
  return result.color;
}

export async function setClientColorActiveHttp(
  kind: "hair" | "eye",
  color: string,
  isActive: boolean,
  baseUrl = "http://localhost:3000",
): Promise<HairColor | EyeColor> {
  return requestJson(
    new URL(
      `${baseUrl.replace(/\/$/, "")}/client/reference/${kind}-colors/${isActive ? "activate" : "deactivate"}`,
    ),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    },
  );
}

export async function loadClientReferenceHttp(
  resource: "cities",
  baseUrl?: string,
): Promise<CitiesResponse>;
export async function loadClientReferenceHttp(
  resource: "id-types" | "hair-colors" | "eye-colors",
  baseUrl?: string,
): Promise<string[]>;
export async function loadClientReferenceHttp(
  resource: "cities" | "id-types" | "hair-colors" | "eye-colors",
  baseUrl = "http://localhost:3000",
): Promise<CitiesResponse | string[]> {
  return requestJson(
    new URL(`${baseUrl.replace(/\/$/, "")}/client/reference/${resource}`),
  );
}

export async function createClientHttp(
  input: CreateClientInput,
  baseUrl = "http://localhost:3000",
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
  const result = await requestJson<Client>(
    new URL(`${baseUrl.replace(/\/$/, "")}/client`),
    {
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
    },
  );
  return restoreClientDates(result);
}

export async function updateClientHttp(
  input: UpdateClientInput,
  baseUrl = "http://localhost:3000",
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
    new URL(
      `${baseUrl.replace(/\/$/, "")}/client/${input.client.client_number}`,
    ),
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
  baseUrl = "http://localhost:3000",
): Promise<Client[]> {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/client`);
  url.search = new URLSearchParams({ firstName, lastName }).toString();

  return requestClients(url);
}

export async function searchClientsByDobHttp(
  dateOfBirth: string,
  baseUrl = "http://localhost:3000",
): Promise<Client[]> {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/client/by-dob`);
  url.search = new URLSearchParams({ dateOfBirth }).toString();
  return requestClients(url);
}

// HTTP response handling is shared by both client searches.
async function requestClients(url: URL): Promise<Client[]> {
  const clients = await requestJson<Client[]>(url);
  return clients.map(restoreClientDates);
}

async function requestJson<T>(url: URL, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      "Unable to reach the server. Check the backend connection.",
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.message;
    const error = new Error(
      Array.isArray(message)
        ? message.join("; ")
        : typeof message === "string"
          ? message
          : "Unable to complete the client request.",
    );
    if (typeof body?.field === "string") {
      Object.assign(error, { field: body.field });
    }
    throw error;
  }

  return response.json() as Promise<T>;
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
