import type { TipoDeReporte } from "../../tipos";
import { request } from "../http";
import { guardarLocal, leerLocal } from "./persistencia";

// Catálogo inicial real suministrado por la API. No son reportes de ejemplo.
export const TIPOS_INICIALES: TipoDeReporte[] = [
  {
    id: "tip-bache",
    nombre: "Bache",
    icono: "construct",
    color: "#E67E22",
    areaResponsable: "Obras Públicas",
  },
  {
    id: "tip-basura",
    nombre: "Basura acumulada",
    icono: "trash",
    color: "#7F8C8D",
    areaResponsable: "Higiene Urbana",
  },
  {
    id: "tip-luminaria",
    nombre: "Luminaria apagada",
    icono: "bulb",
    color: "#F1C40F",
    areaResponsable: "Alumbrado Público",
  },
  {
    id: "tip-otro",
    nombre: "Otro problema",
    icono: "ellipsis-horizontal-circle",
    color: "#34495E",
    areaResponsable: "Centro de Atención al Vecino",
  },
  {
    id: "tip-agua",
    nombre: "Pérdida de agua o cloaca",
    icono: "water",
    color: "#2980B9",
    areaResponsable: "Obras Sanitarias",
  },
  {
    id: "tip-rama",
    nombre: "Rama o árbol caído",
    icono: "leaf",
    color: "#27AE60",
    areaResponsable: "Espacios Verdes",
  },
  {
    id: "tip-semaforo",
    nombre: "Semáforo con falla",
    icono: "stop-circle",
    color: "#C0392B",
    areaResponsable: "Tránsito",
  },
  {
    id: "tip-vereda",
    nombre: "Vereda rota",
    icono: "walk",
    color: "#8E44AD",
    areaResponsable: "Obras Públicas",
  },
];
let actualizando: Promise<void> | null = null;
let ultimaConsulta = 0;
export function tiposGuardados(): TipoDeReporte[] {
  return leerLocal<TipoDeReporte[]>("catalogo-tipos") ?? TIPOS_INICIALES;
}
export async function actualizarTipos(): Promise<void> {
  if (actualizando) return actualizando;
  if (Date.now() - ultimaConsulta < 30_000) return;
  ultimaConsulta = Date.now();
  actualizando = (async () => {
    const tipos: TipoDeReporte[] = [];
    for (let pagina = 1; ; pagina++) {
      const lote = await request<TipoDeReporte[]>(
        `/tipos-de-reporte?pagina=${pagina}&porPagina=100`,
        { timeoutMs: 8000 },
      );
      if (
        !Array.isArray(lote) ||
        !lote.every(
          (t) =>
            typeof t.id === "string" &&
            typeof t.nombre === "string" &&
            typeof t.color === "string" &&
            typeof t.icono === "string" &&
            typeof t.areaResponsable === "string",
        )
      )
        throw new Error("El catálogo recibido no es válido.");
      tipos.push(...lote);
      if (lote.length < 100) break;
    }
    guardarLocal("catalogo-tipos", tipos);
  })().finally(() => {
    actualizando = null;
  });
  return actualizando;
}
