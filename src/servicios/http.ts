const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    code: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

export async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  if (!API_URL) {
    throw new ApiError(
      "Falta la variable EXPO_PUBLIC_API_URL en el .env",
      500,
      "API_URL_NO_CONFIGURADA",
    );
  }

  const headers = new Headers(options.headers ?? {});
  headers.set("Accept", "application/json");

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data?.error?.mensaje ?? data?.message ?? `Error HTTP ${res.status}`;
    const code = data?.error?.codigo ?? data?.code ?? "ERROR_HTTP";

    throw new ApiError(message, res.status, code, data);
  }

  if (data && typeof data === "object" && "datos" in data) {
    return data.datos as T;
  }

  return data as T;
}
