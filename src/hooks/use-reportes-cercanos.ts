import { useEffect, useState } from "react";
import { listarReportesCercanos } from "@/servicios/reportes";
import type { Coordenadas, Reporte } from "@/tipos";
import { vibracionSuave } from "@/utils/haptica";

export function useReportesCercanos(coordenadas: Coordenadas | null) {
  const latitud = coordenadas?.latitud;
  const longitud = coordenadas?.longitud;
  const [intento, setIntento] = useState(0);
  const clave = coordenadas ? `${latitud}:${longitud}:${intento}` : null;
  const [resultado, setResultado] = useState<{
    clave: string;
    reportes: Reporte[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (latitud == null || longitud == null || clave == null) return;
    let activo = true;
    // Esperar a que termine de elegir el punto antes de consultar.
    const espera = setTimeout(() => {
      void listarReportesCercanos({ latitud, longitud }).then((reportes) => {
        if (!activo) return;
        setResultado({ clave, reportes, error: null });
        if (reportes.length) void vibracionSuave().catch(() => {});
      }).catch(() => {
        if (activo) setResultado({
          clave,
          reportes: [],
          error: "No pudimos consultar los reportes cercanos. Revisá tu conexión y reintentá.",
        });
      });
    }, 300);
    return () => {
      activo = false;
      clearTimeout(espera);
    };
  }, [latitud, longitud, clave]);

  const actual = resultado?.clave === clave ? resultado : null;
  return {
    reportes: actual?.reportes ?? [],
    cargando: clave !== null && !actual,
    error: actual?.error ?? null,
    reintentar: () => setIntento((valor) => valor + 1),
  };
}
