import { Cuadrilla } from "../tipos";

export const MOCK_CUADRILLAS: Cuadrilla[] = [
  {
    id: "cua-01",
    nombre: "Cuadrilla 1 — Alumbrado Centro",
    zonaId: "zon-centro",
    especialidad: "Luminarias y semáforos",
    activa: true,
  },
  {
    id: "cua-02",
    nombre: "Cuadrilla 2 — Bacheo Pesado",
    zonaId: "zon-norte",
    especialidad: "Pavimento y asfalto",
    activa: true,
  },
  {
    id: "cua-03",
    nombre: "Cuadrilla 3 — Arbolado y Poda",
    zonaId: "zon-sur",
    especialidad: "Corte de ramas y despeje",
    activa: true,
  },
  {
    id: "cua-04",
    nombre: "Cuadrilla 4 — Sanitarios Quinitas",
    zonaId: "zon-suburbana",
    especialidad: "Desagües y cloacas",
    activa: false,
  },
];
