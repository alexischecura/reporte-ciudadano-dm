import { MOCK_USUARIOS } from "../mocks/usuarios.mock";
import { Usuario } from "../tipos";
import { RespuestaApi } from "../tipos/api";

const esperar = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

export async function login(
  credenciales: CredencialesLogin,
): Promise<RespuestaApi<Usuario>> {
  await esperar(500);

  const usuario = MOCK_USUARIOS.find(
    (u) => u.email.toLowerCase() === credenciales.email.toLowerCase(),
  );

  if (!usuario || !credenciales.password) {
    return {
      error: {
        codigo: "CREDENCIALES_INVALIDAS",
        mensaje: "El email o la contraseña no son correctos.",
      },
    };
  }

  return { datos: usuario };
}

export async function registrar(
  datos: DatosRegistro,
): Promise<RespuestaApi<Usuario>> {
  await esperar(500);

  const yaExiste = MOCK_USUARIOS.some(
    (u) => u.email.toLowerCase() === datos.email.toLowerCase(),
  );

  if (yaExiste) {
    return {
      error: {
        codigo: "EMAIL_YA_REGISTRADO",
        mensaje: "Ya existe una cuenta con ese email.",
      },
    };
  }

  const nuevoUsuario: Usuario = {
    id: `usr-${Date.now()}`,
    nombre: datos.nombre,
    email: datos.email,
    telefono: datos.telefono,
    rol: "vecino",
    zonaId: null,
    avisosActivos: true,
    creadoEn: new Date().toISOString(),
  };

  MOCK_USUARIOS.push(nuevoUsuario);

  return { datos: nuevoUsuario };
}
