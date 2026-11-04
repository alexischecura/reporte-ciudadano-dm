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

  return {
    error: {
      codigo: codigoDefault,
      mensaje: mensajeDefault,
    },
  };
}

export async function login(
  credenciales: CredencialesLogin,
): Promise<RespuestaApi<SesionUsuario>> {
  try {
    const data = await request<{ token: string; usuario: Usuario }>(
      "/auth/ingreso",
      {
        method: "POST",
        body: JSON.stringify({
          email: credenciales.email,
          contrasena: credenciales.password,
        }),
      },
    );

    return {
      datos: {
        usuario: data.usuario,
        token: data.token,
      },
    };
  } catch (error) {
    return mapearError(
      "El email o la contraseña no son correctos.",
      "CREDENCIALES_INVALIDAS",
      error,
    );
  }
}

export async function registrar(
  datos: DatosRegistro,
): Promise<RespuestaApi<Usuario>> {
  try {
    const data = await request<Usuario>("/auth/registro", {
      method: "POST",
      body: JSON.stringify({
        nombre: datos.nombre,
        email: datos.email,
        contrasena: datos.password,
        telefono: datos.telefono ?? undefined,
      }),
    });

    return { datos: data };
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
): Promise<RespuestaApi<Usuario>> {
  try {
    const data = await request<Usuario>("/yo", {
      method: "GET",
      token,
    });

    return { datos: data };
  } catch (error) {
    return mapearError(
      "La sesión guardada ya no es válida.",
      "TOKEN_INVALIDO",
      error,
    );
  }
}
