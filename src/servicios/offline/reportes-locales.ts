import type { BorradorReporte, Reporte } from "../../tipos";
import type { BorradorLocal } from "../../tipos/offline";
import {
  subirArchivoAlServidor,
  limpiarReporteEstricto,
} from "../almacenamiento";
import { ApiError, request } from "../http";
import { obtenerToken, obtenerUsuarioGuardado } from "../sesion";
import { MotorCola, reportePendiente } from "./motor";
import { persistencia, nuevoIdLocal } from "./persistencia";

export const colaReportes = new MotorCola(persistencia);
export const leerEstadoLocal = (usuarioId: string) =>
  persistencia.leer(usuarioId);
export function fechaLocalIso(fecha = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const off = -fecha.getTimezoneOffset();
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}${off >= 0 ? "+" : "-"}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
}
export function nuevoBorrador(): BorradorLocal {
  return {
    id: nuevoIdLocal(),
    creadoEn: fechaLocalIso(),
    tipoId: null,
    descripcion: "",
    fotos: [],
    audioUrl: null,
    ubicacion: null,
  };
}
export function guardarEnCola(
  contenido: BorradorReporte,
  usuarioId: string,
  identidad?: { id: string; creadoEn: string },
): Reporte {
  const identidadLocal = identidad ?? nuevoBorrador();
  return colaReportes.encolar(
    usuarioId,
    identidadLocal.id,
    identidadLocal.creadoEn,
    {
      ...contenido,
      direccion: contenido.direccion.slice(0, 200) || "Dirección no disponible",
    },
  );
}
export function misReportesLocales(usuarioId: string): Reporte[] {
  const e = persistencia.leer(usuarioId);
  const pendientes = e.envios.map((x) => reportePendiente(x, usuarioId));
  return [
    ...pendientes,
    ...e.reportes.filter((r) => !pendientes.some((p) => p.id === r.id)),
  ].sort(
    (a, b) =>
      Date.parse(b.creadoEn) - Date.parse(a.creadoEn) ||
      b.id.localeCompare(a.id),
  );
}
export function guardarReportesConfirmados(
  usuarioId: string,
  reportes: Reporte[],
) {
  const e = persistencia.leer(usuarioId);
  const nuevos = reportes.filter((r) => r.autorId === usuarioId);
  e.reportes = [
    ...nuevos,
    ...e.reportes.filter((r) => !nuevos.some((n) => n.id === r.id)),
  ];
  persistencia.guardar(usuarioId, e);
}

export async function sincronizarReportes(
  usuarioId: string,
  sigueActivo: () => boolean = () => true,
) {
  const token = await obtenerToken();
  const perfil = await obtenerUsuarioGuardado();
  if (!token || perfil?.id !== usuarioId || !sigueActivo()) return;
  const vigente = async () => sigueActivo() && (await obtenerToken()) === token;
  await colaReportes.sincronizar(usuarioId, {
    vigente,
    buscar: async (id) => {
      try {
        return await request<Reporte>(`/reportes/${id}`, {
          token,
          timeoutMs: 15_000,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    subir: async (uri) => (await subirArchivoAlServidor(uri, token)).url,
    crear: async (payload) =>
      request<Reporte>("/reportes", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
        timeoutMs: 90_000,
      }),
    limpiar: limpiarReporteEstricto,
  });
}
