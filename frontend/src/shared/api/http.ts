// `env` is undefined outside Vite (Node tests), so fall back to the dev server.
export const API_BASE_URL: string =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

export const apiUrl = (path: string, baseUrl = API_BASE_URL) =>
  new URL(`${baseUrl.replace(/\/$/, "")}${path}`);

// The server decides the photo's URL; only its address is added here.
export const getImageSrc = (imageUrl?: string | null) =>
  imageUrl ? apiUrl(imageUrl).toString() : null;

export const jsonBody = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export async function requestJson<T>(
  url: URL,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    // 15 seconds unless the caller passes its own signal (a longer timeout).
    response = await fetch(url, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(15000),
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
          : "Unable to complete the request.",
    );
    Object.assign(error, { status: response.status });
    if (typeof body?.field === "string") {
      Object.assign(error, { field: body.field });
    }
    throw error;
  }

  // 204 has no body to parse.
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
