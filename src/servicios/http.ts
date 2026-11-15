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
  options: RequestInit & { token?: string; timeoutMs?: number } = {},
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

  const { token: _token, timeoutMs = 90_000, ...init } = options;
  const controller = new AbortController();
  const cancelar = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener("abort", cancelar);
  const tiempo = setTimeout(cancelar, timeoutMs);
  let res: Response;
  let data: any;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
    data = res.status === 204 ? null : await res.json().catch(() => null);
    if (controller.signal.aborted)
      throw new Error("El servidor no respondió a tiempo.");
    if (res.ok && res.status !== 204 && data === null)
      throw new ApiError(
        "El servidor devolvió una respuesta incompleta. Conservamos los datos para reintentar.",
        502,
        "RESPUESTA_INCOMPLETA",
      );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "No pudimos conectar con el servidor. Tus datos locales se conservan.",
      0,
      "SIN_CONEXION",
    );
  } finally {
    clearTimeout(tiempo);
    options.signal?.removeEventListener("abort", cancelar);
  }

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
