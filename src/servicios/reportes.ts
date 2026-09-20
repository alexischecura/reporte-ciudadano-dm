import { MOCK_REPORTES } from "../mocks/reportes.mock";
import { MOCK_TIPOS_DE_REPORTE } from "../mocks/tipos-de-reporte.mock";
import type { BorradorReporte, Reporte, TipoDeReporte } from "../tipos";

/**
 * Capa de servicios — Módulo del Vecino (Juanchi).
 * Las pantallas NUNCA importan mocks directamente, todo pasa por acá.
 * Funciones asíncronas desde el día 1: hoy devuelven mocks, mañana `fetch`
 * a la API de cátedra (`{ datos, meta }` / `{ error: { codigo, mensaje } }`).
 *
 * TODO(Alexis): conectar `crearReporte()` a SQLite + cola offline
 * (`sincronizado: false`) + `expo-network` para reintento.
 */

/** Lista los 8 tipos de problema (bache, luminaria, basura, ...). */
export async function listarTiposDeReporte(): Promise<TipoDeReporte[]> {
  return MOCK_TIPOS_DE_REPORTE;
}

/** Fecha ISO 8601 con offset local (ej. 2026-09-14T10:22:00-03:00). Nunca Date ni timestamp. */
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

/**
 * Crea un reporte a partir del borrador.
 * Valida la regla PRD: al menos 1 foto (error FOTO_REQUERIDA si no).
 */
export async function crearReporte(borrador: BorradorReporte): Promise<Reporte> {
  if (borrador.fotos.length < 1) {
    throw new Error("FOTO_REQUERIDA: El reporte necesita al menos una foto.");
  }
  const numero = Math.floor(10000 + Math.random() * 89999);
  const ahora = fechaLocalIso();
  return {
    id: `rep-borrador-${Date.now()}`,
    codigo: `GCHU-2026-${numero}`,
    tipoId: borrador.tipoId,
    descripcion: borrador.descripcion,
    audioUrl: borrador.audioUrl,
    fotos: borrador.fotos.map((url, i) => ({
      id: `fot-local-${Date.now()}-${i}`,
      url,
      momento: "problema" as const,
    })),
    coordenadas: borrador.coordenadas,
    direccion: borrador.direccion,
    zonaId: borrador.zonaId,
    estado: "recibido",
    autorId: "usr-084",
    cuadrillaId: null,
    duplicadoDe: null,
    adhesiones: 0,
    creadoEn: ahora,
    // Alexis lo persistirá en SQLite como `false` hasta sincronizar.
    sincronizado: false,
  };
}

/** Solo para previsualizar casos feos en desarrollo (no usar desde pantallas finales). */
export async function listarReportesMock(): Promise<Reporte[]> {
  return MOCK_REPORTES;
}
