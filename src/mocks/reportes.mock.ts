import { Reporte } from "../tipos";

export const MOCK_REPORTES: Reporte[] = [
  // 1. Caso estándar (Con foto y audio)
  {
    id: "rep-00412",
    codigo: "GCHU-2026-00412",
    tipoId: "tip-bache",
    descripcion: "Pozo grande en la mano hacia el centro, pasa el agua.",
    audioUrl: "https://api.gchu.gob.ar/audios/aud-00412.m4a",
    fotos: [
      {
        id: "fot-901",
        url: "https://api.gchu.gob.ar/f/901.jpg",
        momento: "problema",
      },
    ],
    coordenadas: { latitud: -33.0089, longitud: -58.5142 },
    direccion: "Rocamora 1240",
    zonaId: "zon-norte",
    estado: "asignado",
    autorId: "usr-084",
    cuadrillaId: "cua-02",
    duplicadoDe: null,
    adhesiones: 3,
    creadoEn: "2026-09-14T10:22:00-03:00",
    sincronizado: true,
  },

  // 2. CASO FEO: Reporte SIN AUDIO (audioUrl: null) y no sincronizado (en cola offline)
  {
    id: "rep-00413",
    codigo: "GCHU-2026-00413",
    tipoId: "tip-luminaria",
    descripcion: "Luminaria titila por las noches cerca de la esquina.",
    audioUrl: null, // <-- SIN AUDIO
    fotos: [
      {
        id: "fot-902",
        url: "file:///data/user/0/com.gchu.app/files/foto_temp_1.jpg",
        momento: "problema",
      },
    ],
    coordenadas: { latitud: -32.995, longitud: -58.541 },
    direccion: "Urquiza al 2200",
    zonaId: "zon-suburbana",
    estado: "recibido",
    autorId: "usr-084",
    cuadrillaId: null,
    duplicadoDe: null,
    adhesiones: 0,
    creadoEn: "2026-09-14T18:05:00-03:00",
    sincronizado: false, // <-- PENDIENTE DE SUBIR (Sin señal)
  },

  // 3. CASO FEO: Reporte con 5 CAMBIOS DE ESTADO y foto de arreglo
  {
    id: "rep-00100",
    codigo: "GCHU-2026-00100",
    tipoId: "tip-bache",
    descripcion: "Crater profundo rompió la cubierta de un auto.",
    audioUrl: null,
    fotos: [
      {
        id: "fot-100a",
        url: "https://api.gchu.gob.ar/f/100a.jpg",
        momento: "problema",
      },
      {
        id: "fot-100b",
        url: "https://api.gchu.gob.ar/f/100b.jpg",
        momento: "arreglo", // <-- FOTO DEL ARREGLO
      },
    ],
    coordenadas: { latitud: -33.011, longitud: -58.51 },
    direccion: "Bolívar y Rocamora",
    zonaId: "zon-centro",
    estado: "resuelto",
    autorId: "usr-084",
    cuadrillaId: "cua-02",
    duplicadoDe: null,
    adhesiones: 14,
    creadoEn: "2026-09-01T08:00:00-03:00",
    sincronizado: true,
  },

  // 4. CASO FEO: Reporte RECHAZADO con MOTIVO LARGO
  {
    id: "rep-00101",
    codigo: "GCHU-2026-00101",
    tipoId: "tip-vereda",
    descripcion: "Baldosas rotas en el ingreso al complejo privado.",
    audioUrl: "https://api.gchu.gob.ar/audios/aud-00101.m4a",
    fotos: [
      {
        id: "fot-101",
        url: "https://api.gchu.gob.ar/f/101.jpg",
        momento: "problema",
      },
    ],
    coordenadas: { latitud: -33.022, longitud: -58.505 },
    direccion: "Acceso Privado Los Áriboles 450",
    zonaId: "zon-sur",
    estado: "rechazado",
    autorId: "usr-084",
    cuadrillaId: null,
    duplicadoDe: null,
    adhesiones: 1,
    creadoEn: "2026-09-08T10:00:00-03:00",
    sincronizado: true,
  },
];
