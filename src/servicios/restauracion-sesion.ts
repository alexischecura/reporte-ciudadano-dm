import type { Usuario } from "../tipos";
import { esError } from "../tipos/api";
import { validarToken } from "./auth";
import {
  obtenerToken,
  borrarToken,
  obtenerUsuarioGuardado,
  guardarUsuarioSesion,
} from "./sesion";
import { obtenerPreferenciaBiometria } from "./preferencias";
import type { FaseSesion } from "../contexts/sesion-context";

export interface SesionRestaurada {
  usuario: Usuario | null;
  fase: FaseSesion;
  error: string | null;
  biometriaActiva: boolean;
  modoOffline: boolean;
}

export async function cargarSesionGuardada(): Promise<SesionRestaurada> {
  const sinUsuario = {
    usuario: null,
    error: null,
    biometriaActiva: false,
    modoOffline: false,
  };
  try {
    const token = await obtenerToken();
    if (!token) return { ...sinUsuario, fase: "anonimo" };

    const respuesta = await validarToken(token);
    if (esError(respuesta)) {
      if (respuesta.error.codigo === "NO_AUTENTICADO") {
        await borrarToken();
        return { ...sinUsuario, fase: "anonimo" };
      }
      // Sólo una cuenta vecina previamente validada puede continuar trabajando localmente.
      // Esto no autoriza peticiones remotas: la cola vuelve a validar /yo antes de enviarlas.
      const guardado = await obtenerUsuarioGuardado();
      if (
        guardado?.rol === "vecino" &&
        respuesta.error.codigo === "SIN_CONEXION"
      ) {
        const biometriaActiva = await obtenerPreferenciaBiometria(guardado.id);
        return {
          usuario: guardado,
          fase: biometriaActiva ? "bloqueado" : "autenticado",
          error: null,
          biometriaActiva,
          modoOffline: true,
        };
      }
      return {
        ...sinUsuario,
        fase: "sin_conexion",
        error: respuesta.error.mensaje,
      };
    }

    await guardarUsuarioSesion(respuesta.datos, token);
    const biometriaActiva = await obtenerPreferenciaBiometria(
      respuesta.datos.id,
    );
    return {
      usuario: respuesta.datos,
      fase: biometriaActiva ? "bloqueado" : "autenticado",
      error: null,
      biometriaActiva,
      modoOffline: false,
    };
  } catch {
    return {
      ...sinUsuario,
      fase: "sin_conexion",
      error: "No pudimos recuperar la sesión. Probá nuevamente.",
    };
  }
}
