import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useSesion } from "@/contexts/sesion-context";
import {
  colaReportes,
  leerEstadoLocal,
  sincronizarReportes,
} from "@/servicios/offline/reportes-locales";
import { suscribirDatosLocales } from "@/servicios/offline/persistencia";
import { actualizarTipos } from "@/servicios/offline/catalogo";

/** Reintenta con la app activa, al regresar a ella y tras cada cambio de cola.
 * No depende del estado del wifi: verifica la conexión real y la sesión contra la API.
 */
export function GestorColaReportes() {
  const { usuario, fase, modoOffline, verificarConexion } = useSesion();
  const offline = useRef(modoOffline);
  useEffect(() => {
    offline.current = modoOffline;
  }, [modoOffline]);
  const usuarioId = usuario?.id;
  const esVecino = usuario?.rol === "vecino";
  useEffect(() => {
    if (fase !== "autenticado" || !usuarioId || !esVecino) return;
    let activo = true;
    let ocupado = false;
    let verificado = false;
    const ejecutar = async () => {
      if (!activo || ocupado || AppState.currentState !== "active") return;
      ocupado = true;
      try {
        const estado = leerEstadoLocal(usuarioId);
        const hayCola = estado.envios.some((e) => e.estado !== "error");
        if (
          verificado &&
          !offline.current &&
          !hayCola &&
          !estado.limpieza.length
        )
          return;
        if (!verificado || offline.current || hayCola) {
          const estabaOffline = offline.current;
          const primeraValidacion = !verificado;
          if (!(await verificarConexion()) || !activo) return;
          verificado = true;
          if (primeraValidacion || estabaOffline)
            colaReportes.reactivarSesion(usuarioId);
          if (estabaOffline) {
            const pendientes = leerEstadoLocal(usuarioId).envios.filter(
              (e) => e.estado === "pendiente",
            );
            for (const e of pendientes)
              colaReportes.reintentar(usuarioId, e.id);
          }
          void actualizarTipos().catch(() => undefined);
        }
        if (activo)
          await sincronizarReportes(
            usuarioId,
            () => activo && AppState.currentState === "active",
          );
      } catch {
        // El estado persistido conserva el error y los archivos. Volver a intentar luego.
      } finally {
        ocupado = false;
      }
    };
    const iniciar = () => {
      void ejecutar();
    };
    iniciar();
    const intervalo = setInterval(iniciar, 15_000);
    const cambios = AppState.addEventListener("change", (estado) => {
      if (estado === "active") {
        verificado = false;
        iniciar();
      }
    });
    const dejarDeEscuchar = suscribirDatosLocales(iniciar);
    return () => {
      activo = false;
      clearInterval(intervalo);
      cambios.remove();
      dejarDeEscuchar();
    };
  }, [fase, usuarioId, esVecino, verificarConexion]);
  return null;
}
