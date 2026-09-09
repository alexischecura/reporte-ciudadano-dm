import { Coordenadas } from "./reporte";

export interface Zona {
  id: string;
  nombre: string;
  limite: Coordenadas[];
  referente: string;
}
