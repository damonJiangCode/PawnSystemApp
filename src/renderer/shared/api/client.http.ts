import type { Client } from "../../../shared/models/client.model.ts";

export async function searchClientsHttp(
  firstName: string,
  lastName: string,
  baseUrl = "http://localhost:3000",
): Promise<Client[]> {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/client`);
  url.search = new URLSearchParams({ firstName, lastName }).toString();

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch {
    throw new Error("Unable to reach the server. Check the backend connection.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.message;
    throw new Error(
      Array.isArray(message) ? message.join("; ") :
        typeof message === "string" ? message : "Unable to search clients.",
    );
  }

  const clients = await response.json() as Client[];
  return clients.map(client => ({
    ...client,
    date_of_birth: new Date(client.date_of_birth),
    updated_at: new Date(client.updated_at),
    image_updated_at: client.image_updated_at
      ? new Date(client.image_updated_at) : null,
    identifications: client.identifications?.map(id => ({
      ...id,
      updated_at: id.updated_at ? new Date(id.updated_at) : undefined,
    })),
  }));
}
