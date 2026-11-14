import type { Coordenadas, EstadoReporte, Reporte } from "@/tipos";

export const CENTRO_GUALEGUAYCHU: Coordenadas = {
  latitud: -33.0089,
  longitud: -58.5142,
};
export const RADIO_MUNICIPAL_METROS = 15_000;
export const RADIO_DUPLICADOS_METROS = 50;
export const RADIO_EXPLORACION_METROS = 1_000;

export const ESTADOS_REPORTE: { valor: EstadoReporte; nombre: string }[] = [
  { valor: "recibido", nombre: "Recibido" },
  { valor: "en_revision", nombre: "En revisión" },
  { valor: "asignado", nombre: "Asignado" },
  { valor: "resuelto", nombre: "Resuelto" },
  { valor: "rechazado", nombre: "Rechazado" },
];

export function distanciaMetros(a: Coordenadas, b: Coordenadas): number {
  const rad = (grados: number) => (grados * Math.PI) / 180;
  const h =
    Math.sin(rad(b.latitud - a.latitud) / 2) ** 2 +
    Math.cos(rad(a.latitud)) * Math.cos(rad(b.latitud)) *
      Math.sin(rad(b.longitud - a.longitud) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function fueraDeZonaMunicipal(coordenadas: Coordenadas): boolean {
  return distanciaMetros(CENTRO_GUALEGUAYCHU, coordenadas) > RADIO_MUNICIPAL_METROS;
}

export function filtrarReportesMapa(
  reportes: Reporte[],
  tipoId: string | null,
  estado: EstadoReporte | null,
  cercaDe: Coordenadas | null,
): Reporte[] {
  return reportes.filter((reporte) =>
    (!tipoId || reporte.tipoId === tipoId) &&
    (!estado || reporte.estado === estado) &&
    (!cercaDe || distanciaMetros(cercaDe, reporte.coordenadas) <= RADIO_EXPLORACION_METROS),
  );
}
