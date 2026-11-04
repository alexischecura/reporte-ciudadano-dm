import {
  type BorradorReporte,
  type CambioDeEstado,
  type Reporte,
  type TipoDeReporte,
} from "../tipos";
import { type RespuestaApi } from "../tipos/api";
import { ApiError, request } from "./http";
import { obtenerToken } from "./sesion";

function mapearError(
  mensajeDefault: string,
  codigoDefault: string,
  error: unknown,
): RespuestaApi<never> {
  if (error instanceof ApiError) {
    return {
      error: {
        codigo: error.code || codigoDefault,
        mensaje: error.message || mensajeDefault,
      },
    };
  }

  return {
    error: {
      codigo: codigoDefault,
      mensaje: mensajeDefault,
    },
  };
}

function construirQuery(
  query?: Record<string, string | number | boolean | undefined>,
) {
  if (!query) return "";

  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });

  const queryString = search.toString();
  return queryString ? `?${queryString}` : "";
}

export async function listarTiposDeReporte(): Promise<TipoDeReporte[]> {
  return request<TipoDeReporte[]>("/tipos-de-reporte");
}

export async function listarReportes(
  query?: Record<string, string | number | boolean | undefined>,
): Promise<Reporte[]> {
  return request<Reporte[]>(`/reportes${construirQuery(query)}`);
}

export async function listarMisReportes(): Promise<Reporte[]> {
  const token = await obtenerToken();
  if (!token) {
    throw new Error("No hay sesión activa para ver tus reportes.");
  }

  return request<Reporte[]>("/yo/reportes", {
    method: "GET",
    token,
  });
}

export async function obtenerReporte(id: string): Promise<Reporte> {
  return request<Reporte>(`/reportes/${id}`);
}

export async function obtenerCambiosDeReporte(
  reporteId: string,
): Promise<CambioDeEstado[]> {
  return request<CambioDeEstado[]>(`/reportes/${reporteId}/cambios`);
}

export function fechaLocalIso(fecha = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const offMin = -fecha.getTimezoneOffset();
  const signo = offMin >= 0 ? "+" : "-";
  const abs = Math.abs(offMin);
  const off = `${signo}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return (
    `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}` +
    `T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}${off}`
  );
}

export async function crearReporte(
  borrador: BorradorReporte,
  usuarioId: string,
): Promise<RespuestaApi<Reporte>> {
  if (!usuarioId?.trim()) {
    return {
      error: {
        codigo: "NO_AUTENTICADO",
        mensaje: "Tenés que iniciar sesión para crear un reporte.",
      },
    };
  }

  if (borrador.fotos.length < 1) {
    return {
      error: {
        codigo: "FOTO_REQUERIDA",
        mensaje: "El reporte necesita al menos una foto.",
      },
    };
  }

  try {
    const token = await obtenerToken();
    if (!token) {
      return {
        error: {
          codigo: "NO_AUTENTICADO",
          mensaje: "Tu sesión expiró. Iniciá sesión nuevamente.",
        },
      };
    }

    const payload = {
      tipoId: borrador.tipoId,
      descripcion: borrador.descripcion ?? undefined,
      fotos: borrador.fotos.map((url) => ({ url, momento: "problema" })),
      audioUrl: borrador.audioUrl ?? undefined,
      coordenadas: borrador.coordenadas,
      direccion: borrador.direccion,
      zonaId: borrador.zonaId,
      autorId: usuarioId,
      creadoEn: fechaLocalIso(),
    };

    const data = await request<Reporte>("/reportes", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });

    return { datos: data };
  } catch (error) {
    return mapearError(
      "No se pudo crear el reporte.",
      "REPORTE_NO_CREADO",
      error,
    );
  }
}

export async function listarReportesMock(): Promise<Reporte[]> {
  const { MOCK_REPORTES } = await import("../mocks/reportes.mock");
  return MOCK_REPORTES;
}
