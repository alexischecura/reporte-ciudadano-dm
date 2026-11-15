import {
  type BorradorReporte,
  type CambioDeEstado,
  type Coordenadas,
  type Reporte,
  type TipoDeReporte,
} from "../tipos";
import { type RespuestaApi } from "../tipos/api";
import { subirArchivoAlServidor } from "./almacenamiento";
import { ApiError, request } from "./http";
import { obtenerToken, obtenerUsuarioGuardado } from "./sesion";
import { actualizarTipos, tiposGuardados } from "./offline/catalogo";
import {
  guardarEnCola,
  guardarReportesConfirmados,
  misReportesLocales,
} from "./offline/reportes-locales";
import { ESTADOS_REPORTE, RADIO_DUPLICADOS_METROS } from "@/utils/ubicacion";

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
  const tipos = tiposGuardados();
  void actualizarTipos().catch(() => undefined);
  return tipos;
}

export async function listarReportes(
  query?: Record<string, string | number | boolean | undefined>,
): Promise<Reporte[]> {
  return request<Reporte[]>(`/reportes${construirQuery(query)}`);
}

// Recorrer páginas evita filtrar solamente la primera página del mapa.
async function listarTodasLasPaginas(
  path: string,
  query: Record<string, string | number>,
  porPagina: number,
  opciones: { token?: string; timeoutMs?: number } = {},
): Promise<Reporte[]> {
  const reportes: Reporte[] = [];
  for (let pagina = 1; ; pagina++) {
    const lote = await request<Reporte[]>(
      `${path}${construirQuery({ ...query, pagina, porPagina })}`,
      opciones,
    );
    reportes.push(...lote);
    if (lote.length < porPagina) return reportes;
  }
}

export async function listarReportesDelMapa(): Promise<Reporte[]> {
  return listarTodasLasPaginas(
    "/reportes",
    {
      estado: ESTADOS_REPORTE.map(({ valor }) => valor).join(","),
    },
    500,
  );
}

export async function listarReportesCercanos(
  coordenadas: Coordenadas,
): Promise<Reporte[]> {
  return listarTodasLasPaginas(
    "/reportes/cercanos",
    {
      latitud: coordenadas.latitud,
      longitud: coordenadas.longitud,
      radioMetros: RADIO_DUPLICADOS_METROS,
    },
    100,
    { timeoutMs: 8000 },
  );
}

export async function listarMisReportes(): Promise<Reporte[]> {
  const token = await obtenerToken();
  if (!token) {
    throw new Error("No hay sesión activa para ver tus reportes.");
  }

  const usuario = await obtenerUsuarioGuardado();
  if (!usuario) throw new Error("No se pudo recuperar tu cuenta.");
  try {
    const reportes = await listarTodasLasPaginas("/yo/reportes", {}, 100, {
      token,
      timeoutMs: 15_000,
    });
    if ((await obtenerToken()) !== token) throw new Error("La sesión cambió.");
    guardarReportesConfirmados(usuario.id, reportes);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status > 0 &&
      error.status < 500 &&
      error.status !== 408 &&
      error.status !== 429
    )
      throw error;
  }
  return misReportesLocales(usuario.id);
}

export async function obtenerReporte(id: string): Promise<Reporte> {
  return request<Reporte>(`/reportes/${id}`);
}

export async function obtenerEstadoAdhesionReporte(
  reporteId: string,
): Promise<boolean> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error("Tenés que iniciar sesión para consultar tu adhesión.");
  }

  const data = await request<{ adherido: boolean }>(
    `/reportes/${reporteId}/adhesion`,
    {
      method: "GET",
      token,
    },
  );

  return data.adherido;
}

export async function adherirseAReporte(reporteId: string): Promise<Reporte> {
  const token = await obtenerToken();

  if (!token) {
    throw new Error("Tenés que iniciar sesión para adherirte a este reporte.");
  }

  return request<Reporte>(`/reportes/${reporteId}/adhesiones`, {
    method: "POST",
    token,
  });
}

export async function obtenerCambiosDeReporte(
  reporteId: string,
): Promise<CambioDeEstado[]> {
  return request<CambioDeEstado[]>(`/reportes/${reporteId}/cambios`);
}

export { fechaLocalIso } from "./offline/reportes-locales";

/** Primero confirma la escritura local. El gestor de cola se encarga del envío. */
export async function crearReporte(
  borrador: BorradorReporte,
  usuarioId: string,
  identidad?: { id: string; creadoEn: string },
): Promise<RespuestaApi<Reporte>> {
  try {
    const perfil = await obtenerUsuarioGuardado();
    if (!usuarioId || perfil?.id !== usuarioId)
      throw new Error("Primero iniciá sesión con tu cuenta.");
    return { datos: guardarEnCola(borrador, usuarioId, identidad) };
  } catch (error) {
    return mapearError(
      error instanceof Error
        ? error.message
        : "No pudimos guardar el reporte en este teléfono.",
      "REPORTE_NO_GUARDADO",
      error,
    );
  }
}

// NOTA: Se mantiene esta función por si se utiliza en alguna pantalla antigua,
// pero la bandeja del operador ya no dependerá de ella.
export async function listarReportesMock(): Promise<Reporte[]> {
  const { MOCK_REPORTES } = await import("../mocks/reportes.mock");
  return MOCK_REPORTES;
}

export async function listarBandejaOperador(
  query?: Record<string, string | number | boolean | undefined>,
): Promise<any> {
  const token = await obtenerToken();
  if (!token) {
    throw new Error("No hay sesión activa de operador.");
  }

  return request<any>(`/bandeja${construirQuery(query)}`, {
    method: "GET",
    token,
  });
}

export async function cambiarEstadoReporte(
  reporteId: string,
  estado: string,
  comentario: string,
  fotoUri?: string | null,
): Promise<any> {
  const token = await obtenerToken();
  if (!token) {
    throw new Error("No hay sesión activa para cambiar el estado.");
  }

  // 1. Enviamos el cambio de estado (el PATCH estricto que solo acepta estado y comentario)
  const respuesta = await request<any>(`/reportes/${reporteId}/estado`, {
    method: "PATCH",
    token,
    body: JSON.stringify({
      estado,
      comentario: comentario.trim(),
    }),
  });

  // 2. Si hay foto y es resuelto, la subimos y la enviamos a su endpoint específico
  if (fotoUri && estado === "resuelto") {
    const archivoSubido = await subirArchivoAlServidor(fotoUri, token);

    await request<any>(`/reportes/${reporteId}/fotos`, {
      method: "POST",
      token,
      body: JSON.stringify({
        url: archivoSubido.url,
      }),
    });
  }

  return respuesta;
}

export async function asignarCuadrillaReporte(
  reporteId: string,
  cuadrillaId: string,
  comentario: string,
): Promise<any> {
  const token = await obtenerToken();
  if (!token) {
    throw new Error("No hay sesión activa para asignar cuadrilla.");
  }

  return request<any>(`/reportes/${reporteId}/cuadrilla`, {
    method: "PATCH",
    token,
    body: JSON.stringify({
      cuadrillaId,
      comentario: comentario.trim(),
    }),
  });
}

export async function listarCuadrillas(): Promise<any> {
  const token = await obtenerToken();
  if (!token) {
    throw new Error("No hay sesión activa para ver las cuadrillas.");
  }

  return request<any>("/cuadrillas", {
    method: "GET",
    token,
  });
}

export async function listarZonas(): Promise<any[]> {
  return request<any[]>("/zonas", { method: "GET" });
}

export async function marcarReporteComoDuplicado(
  reporteId: string,
  originalInput: string,
  comentario: string,
): Promise<any> {
  const token = await obtenerToken();
  if (!token) {
    throw new Error("No hay sesión activa para marcar duplicados.");
  }

  let originalId = originalInput.trim();

  // Si el operador ingresó un código visible (ej: GCHU-...) en lugar del ID interno (rep-...)
  if (!originalId.startsWith("rep-")) {
    try {
      // Intentamos buscar el reporte por su código en el endpoint correspondiente
      const resCodigo = await request<any>(`/reportes/codigo/${originalId}`);
      const reporteEncontrado = resCodigo?.datos || resCodigo;
      if (reporteEncontrado?.id) {
        originalId = reporteEncontrado.id;
      }
    } catch {
      // Fallback: buscamos en el listado general si el endpoint anterior no estuviera disponible
      const todos = await listarReportes();
      const encontrado = todos.find(
        (r) => r.codigo.toLowerCase() === originalInput.toLowerCase(),
      );
      if (encontrado) {
        originalId = encontrado.id;
      }
    }
  }

  return request<any>(`/reportes/${reporteId}/duplicado`, {
    method: "POST",
    token,
    body: JSON.stringify({
      originalId,
    }),
  });
}
