export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export interface Foto {
  id: string;
  url: string; // o ruta local mientras no se subió
  momento: "problema" | "arreglo";
}

export type EstadoReporte =
  | "recibido"
  | "en_revision"
  | "asignado"
  | "resuelto"
  | "rechazado";

export interface Reporte {
  id: string;
  codigo: string;
  tipoId: string;
  descripcion: string | null;
  audioUrl: string | null;
  fotos: Foto[]; // Al menos una es obligatoria
  coordenadas: Coordenadas;
  direccion: string;
  zonaId: string;
  estado: EstadoReporte;
  autorId: string;
  cuadrillaId: string | null;
  duplicadoDe: string | null;
  adhesiones: number;
  creadoEn: string;
  sincronizado: boolean; // false mientras está en la cola local
}
