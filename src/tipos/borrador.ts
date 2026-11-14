import type { Coordenadas } from "./reporte";

/** Contenido validado que se conserva en la cola hasta confirmar el envío. */
export interface BorradorReporte {
  tipoId: string;
  descripcion: string | null;
  /** URIs locales persistentes (document/), no cache. Máx 2 fotos. */
  fotos: string[];
  /** URI local persistente del .m4a, o null si no grabó nota. */
  audioUrl: string | null;
  coordenadas: Coordenadas;
  direccion: string;
}
