import { TipoDeReporte } from "../tipos";

export const MOCK_TIPOS_DE_REPORTE: TipoDeReporte[] = [
  {
    id: "tip-bache",
    nombre: "Bache",
    icono: "warning-outline",
    color: "#C1440E",
    areaResponsable: "Obras Públicas",
  },
  {
    id: "tip-luminaria",
    nombre: "Luminaria",
    icono: "bulb-outline",
    color: "#E6A100",
    areaResponsable: "Electromecánica",
  },
  {
    id: "tip-basura",
    nombre: "Basura",
    icono: "trash-outline",
    color: "#4A7C59",
    areaResponsable: "Higiene Urbana",
  },
  {
    id: "tip-rama",
    nombre: "Rama / Árbol",
    icono: "leaf-outline",
    color: "#2D5A27",
    areaResponsable: "Espacios Verdes",
  },
  {
    id: "tip-agua",
    nombre: "Agua / Cloaca",
    icono: "water-outline",
    color: "#1E88E5",
    areaResponsable: "Obras Sanitarias",
  },
  {
    id: "tip-semaforo",
    nombre: "Semáforo",
    icono: "stoplight-outline",
    color: "#D32F2F",
    areaResponsable: "Tránsito y Señalización",
  },
  {
    id: "tip-vereda",
    nombre: "Vereda",
    icono: "walk-outline",
    color: "#6D4C41",
    areaResponsable: "Obras Privadas y Vías Públicas",
  },
  {
    id: "tip-otro",
    nombre: "Otro",
    icono: "ellipsis-horizontal-circle-outline",
    color: "#546E7A",
    areaResponsable: "Atención al Vecino",
  },
];
