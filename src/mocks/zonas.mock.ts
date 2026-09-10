import { Zona } from "../tipos";

export const MOCK_ZONAS: Zona[] = [
  {
    id: "zon-norte",
    nombre: "Zona Norte",
    referente: "Corralón Norte",
    limite: [
      { latitud: -32.99, longitud: -58.53 },
      { latitud: -32.99, longitud: -58.49 },
      { latitud: -33.02, longitud: -58.49 },
      { latitud: -33.02, longitud: -58.53 },
    ],
  },
  {
    id: "zon-sur",
    nombre: "Zona Sur",
    referente: "Corralón Sur",
    limite: [
      { latitud: -33.02, longitud: -58.53 },
      { latitud: -33.02, longitud: -58.49 },
      { latitud: -33.05, longitud: -58.49 },
      { latitud: -33.05, longitud: -58.53 },
    ],
  },
  {
    id: "zon-centro",
    nombre: "Zona Centro",
    referente: "Palacio Municipal",
    limite: [
      { latitud: -33.0, longitud: -58.52 },
      { latitud: -33.0, longitud: -58.5 },
      { latitud: -33.02, longitud: -58.5 },
      { latitud: -33.02, longitud: -58.52 },
    ],
  },
  {
    id: "zon-suburbana",
    nombre: "Zona Quinitas / Suburbana",
    referente: "Base Operativa Oeste",
    limite: [
      { latitud: -32.97, longitud: -58.56 },
      { latitud: -32.97, longitud: -58.53 },
      { latitud: -33.04, longitud: -58.53 },
      { latitud: -33.04, longitud: -58.56 },
    ],
  },
];
