import type { BorradorReporte, Reporte } from "./index";

export interface UbicacionBorrador {
  latitude: number;
  longitude: number;
  direccion: string;
}

export interface BorradorLocal {
  id: string;
  creadoEn: string;
  tipoId: string | null;
  descripcion: string;
  fotos: string[];
  audioUrl: string | null;
  ubicacion: UbicacionBorrador | null;
}

export interface EnvioLocal {
  id: string;
  creadoEn: string;
  contenido: BorradorReporte;
  fotosSubidas: ({ id: string; url: string } | null)[];
  audioSubido: string | null;
  estado: "pendiente" | "enviando" | "error" | "sesion";
  intentos: number;
  recargasArchivos: number;
  proximoIntento: number;
  error: string | null;
}

export interface EstadoLocal {
  version: 1;
  borrador: BorradorLocal | null;
  envios: EnvioLocal[];
  reportes: Reporte[];
  limpieza: string[];
}
