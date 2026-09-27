import type { ApiError } from "@/lib/contracts";

export class ClientApiError extends Error {
  details?: Record<string, unknown>;
  status: number;

  constructor(message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;
    let details: Record<string, unknown> | undefined;

    try {
      const data = (await res.json()) as ApiError;
      if (data && typeof data.error === "string") {
        errorMessage = data.error;
        details = data.details;
      }
    } catch {
      // Non-JSON response
    }

    throw new ClientApiError(errorMessage, res.status, details);
  }

  return (await res.json()) as T;
}
