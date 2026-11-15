import { Usuario } from "../tipos";
import { RespuestaApi } from "../tipos/api";
import { ApiError, request } from "./http";

export interface CredencialesLogin {
  email: string;
  password: string;
}

export interface DatosRegistro {
  nombre: string;
  email: string;
  telefono: string | null;
  password: string;
}

export interface SesionUsuario {
  usuario: Usuario;
  token: string;
}

function mapearError(
  mensajeDefault: string,
  codigoDefault: string,
  error: unknown,
): RespuestaApi<never> {
  if (error instanceof ApiError) {
    return {
      error: {
        codigo: error.code || codigoDefault,
        mensaje: error.message || mensajeDefault,
      },
    };
  }

  // Un fallo de transporte no es lo mismo que un 401 de credenciales.
  return {
    error: {
      codigo: "SIN_CONEXION",
      mensaje:
        "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.",
    },
  };
}

export async function login(
  credenciales: CredencialesLogin,
): Promise<RespuestaApi<SesionUsuario>> {
  try {
    const datos = await request<SesionUsuario>("/auth/ingreso", {
      method: "POST",
      body: JSON.stringify({
        email: credenciales.email.trim().toLowerCase(),
        contrasena: credenciales.password,
      }),
    });
    return { datos };
  } catch (error) {
    return mapearError("No se pudo iniciar sesión.", "LOGIN_FALLIDO", error);
  }
}

export async function registrar(
  datos: DatosRegistro,
): Promise<RespuestaApi<SesionUsuario>> {
  try {
    // El registro devuelve la misma estructura {token, usuario} que el login.
    const sesion = await request<SesionUsuario>("/auth/registro", {
      method: "POST",
      body: JSON.stringify({
        nombre: datos.nombre.trim(),
        email: datos.email.trim().toLowerCase(),
        contrasena: datos.password,
        ...(datos.telefono?.trim() ? { telefono: datos.telefono.trim() } : {}),
      }),
    });
    return { datos: sesion };
  } catch (error) {
    return mapearError(
      "No se pudo crear la cuenta.",
      "REGISTRO_FALLIDO",
      error,
    );
  }
}

export async function validarToken(
  token: string,
  timeoutMs = 12_000,
): Promise<RespuestaApi<Usuario>> {
  try {
    const usuario = await request<Usuario>("/yo", {
      method: "GET",
      token,
      timeoutMs,
    });
    return { datos: usuario };
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status >= 500 || error.status === 408 || error.status === 429)
    ) {
      return {
        error: {
          codigo: "SIN_CONEXION",
          mensaje: "El servidor no está disponible. Conservamos tu sesión.",
        },
      };
    }
    return mapearError(
      "No se pudo validar la sesión.",
      "VALIDACION_FALLIDA",
      error,
    );
  }
}
