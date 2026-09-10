import { CambioDeEstado } from "../tipos";

// Caso: Reporte con 5 cambios de estado completos (rep-00100)
export const MOCK_CAMBIOS_ESTADO_CINCO_PASOS: CambioDeEstado[] = [
  {
    id: "cam-501",
    reporteId: "rep-00100",
    estado: "recibido",
    comentario: "Reporte ingresado correctamente desde la app.",
    operadorId: null,
    fechaHora: "2026-09-01T08:00:00-03:00",
  },
  {
    id: "cam-502",
    reporteId: "rep-00100",
    estado: "en_revision",
    comentario:
      "Verificado e inspeccionado en el lugar por el inspector de zona.",
    operadorId: "usr-003",
    fechaHora: "2026-09-01T11:30:00-03:00",
  },
  {
    id: "cam-503",
    reporteId: "rep-00100",
    estado: "asignado",
    comentario: "Programado y asignado a la Cuadrilla 2 de Bacheo Pesado.",
    operadorId: "usr-003",
    fechaHora: "2026-09-02T09:15:00-03:00",
  },
  {
    id: "cam-504",
    reporteId: "rep-00100",
    estado: "en_revision",
    comentario:
      "Re-evaluado por falta de material asfáltico caliente. Se pausa temporalmente la intervención.",
    operadorId: "usr-003",
    fechaHora: "2026-09-03T14:20:00-03:00",
  },
  {
    id: "cam-505",
    reporteId: "rep-00100",
    estado: "resuelto",
    comentario: "Bacheo completado, compactado y finalizado con éxito.",
    operadorId: "usr-003",
    fechaHora: "2026-09-05T16:45:00-03:00",
  },
];

// Caso: Reporte rechazado con motivo largo (rep-00101)
export const MOCK_CAMBIOS_ESTADO_RECHAZADO_LARGO: CambioDeEstado[] = [
  {
    id: "cam-601",
    reporteId: "rep-00101",
    estado: "recibido",
    comentario: "Reporte recibido.",
    operadorId: null,
    fechaHora: "2026-09-08T10:00:00-03:00",
  },
  {
    id: "cam-602",
    reporteId: "rep-00101",
    estado: "rechazado",
    comentario:
      "El reclamo ha sido desestimado debido a que la propiedad indicada pertenece a un lote de jurisdicción privada del emprendimiento inmobiliario o barrio privado en cuestión, y no a la vía pública municipal regulada por la Ordenanza 10.412/2019. Corresponde al consorcio interno de propietarios realizar las tareas de mantenimiento sobre dicho tramo de vereda e iluminación. Se le aconseja al vecino trasladar la inquietud al administrador del complejo.",
    operadorId: "usr-003",
    fechaHora: "2026-09-08T12:30:00-03:00",
  },
];
