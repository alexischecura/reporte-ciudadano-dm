import { MOCK_REPORTES } from "./reportes.mock";

// 1. Respuesta exitosa con paginación
export const MOCK_RESPUESTA_EXITO_LISTA = {
  datos: MOCK_REPORTES,
  meta: {
    total: MOCK_REPORTES.length,
    pagina: 1,
    porPagina: 20,
  },
};

// 2. CASO FEO: Respuesta con LISTA VACÍA
export const MOCK_RESPUESTA_LISTA_VACIA = {
  datos: [],
  meta: {
    total: 0,
    pagina: 1,
    porPagina: 20,
  },
};

// 3. CASO FEO: Respuesta de ERROR DE RED o conexión intermitente
export const MOCK_RESPUESTA_ERROR_RED = {
  error: {
    codigo: "RED_ERROR",
    mensaje:
      "No se pudo establecer conexión con el servidor. Verifique su señal de red e intente nuevamente.",
  },
};

// 4. CASO FEO: Error de validación según PRD (ej. Falta foto)
export const MOCK_RESPUESTA_ERROR_FOTO_REQUERIDA = {
  error: {
    codigo: "FOTO_REQUERIDA",
    mensaje: "El reporte necesita al menos una foto.",
  },
};

// 5. CASO FEO: Error de permisos
export const MOCK_RESPUESTA_ERROR_NO_AUTORIZADO = {
  error: {
    codigo: "NO_AUTORIZADO",
    mensaje:
      "No tiene permisos de operador para cambiar el estado del reporte.",
  },
};
