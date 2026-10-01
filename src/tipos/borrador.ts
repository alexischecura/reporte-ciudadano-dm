import type { Coordenadas } from "./reporte";

/**
 * Borrador local del reporte antes de crearse.
 * Lo arma la pantalla de Juanchi (Módulo del Vecino) y lo consume
 * `src/servicios/reportes.ts` -> `crearReporte()`.
 *
 * TODO(Alexis): reemplazar coordenadas/direccion/zonaId mockeadas por GPS real
 * (expo-location) y guardar en SQLite con `sincronizado: false` para cola offline.
 */
export interface BorradorReporte {
  tipoId: string;
  descripcion: string | null;
  /** URIs locales persistentes (document/), no cache. Máx 2 fotos. */
  fotos: string[];
  /** URI local persistente del .m4a, o null si no grabó nota. */
  audioUrl: string | null;
  coordenadas: Coordenadas;
  direccion: string;
  zonaId: string;
}
