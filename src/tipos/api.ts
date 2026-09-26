export interface ErrorApi {
  codigo: string;
  mensaje: string;
}

export interface RespuestaExito<T> {
  datos: T;
  meta?: {
    total: number;
    pagina: number;
    porPagina: number;
  };
}

export interface RespuestaError {
  error: ErrorApi;
}

export type RespuestaApi<T> = RespuestaExito<T> | RespuestaError;

export function esError<T>(
  respuesta: RespuestaApi<T>,
): respuesta is RespuestaError {
  return "error" in respuesta;
}
