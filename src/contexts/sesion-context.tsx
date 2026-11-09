import {
  CredencialesLogin,
  DatosRegistro,
  SesionUsuario,
  login as loginServicio,
  registrar as registrarServicio,
  validarToken,
} from "@/servicios/auth";
import {
  autenticarConBiometria,
  haySoporteBiometrico,
  ResultadoBiometria,
} from "@/servicios/biometria";
import {
  guardarPreferenciaBiometria,
  obtenerPreferenciaBiometria,
} from "@/servicios/preferencias";
import { borrarToken, guardarToken, obtenerToken } from "@/servicios/sesion";
import { Usuario } from "@/tipos";
import { esError } from "@/tipos/api";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type FaseSesion =
  | "cargando"
  | "anonimo"
  | "bloqueado"
  | "sin_conexion"
  | "autenticado";

type ResultadoAcceso = { ok: boolean; mensaje?: string };

interface SesionContextType {
  usuario: Usuario | null;
  cargando: boolean;
  fase: FaseSesion;
  errorSesion: string | null;
  biometriaActiva: boolean;
  login: (datos: CredencialesLogin) => Promise<ResultadoAcceso>;
  registrar: (datos: DatosRegistro) => Promise<ResultadoAcceso>;
  logout: () => Promise<void>;
  usarOtraCuenta: () => Promise<void>;
  reintentarRestauracion: () => Promise<void>;
  desbloquear: () => Promise<ResultadoBiometria>;
  cambiarBiometria: (habilitada: boolean) => Promise<ResultadoAcceso>;
}

const SesionContext = createContext<SesionContextType | undefined>(undefined);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [fase, setFase] = useState<FaseSesion>("cargando");
  const [errorSesion, setErrorSesion] = useState<string | null>(null);
  const [biometriaActiva, setBiometriaActiva] = useState(false);

  const restaurar = useCallback(async () => {
    setFase("cargando");
    setErrorSesion(null);
    try {
      const token = await obtenerToken();
      if (!token) {
        setUsuario(null);
        setFase("anonimo");
        return;
      }

      const respuesta = await validarToken(token);
      if (esError(respuesta)) {
        if (respuesta.error.codigo === "NO_AUTENTICADO") {
          await borrarToken();
          setUsuario(null);
          setBiometriaActiva(false);
          setFase("anonimo");
          return;
        }
        // No destruir un token válido por caída de wifi, 500 o timeout.
        setUsuario(null);
        setErrorSesion(respuesta.error.mensaje);
        setFase("sin_conexion");
        return;
      }

      const perfil = respuesta.datos;
      setUsuario(perfil);
      const preferencia = await obtenerPreferenciaBiometria(perfil.id);
      setBiometriaActiva(preferencia);
      setFase(preferencia ? "bloqueado" : "autenticado");
    } catch {
      setUsuario(null);
      setErrorSesion("No pudimos recuperar la sesión. Probá nuevamente.");
      setFase("sin_conexion");
    }
  }, []);

  useEffect(() => {
    void restaurar();
  }, [restaurar]);

  async function completarAcceso(sesion: SesionUsuario): Promise<ResultadoAcceso> {
    try {
      // Primero guardar de forma segura; luego mostrar la ruta privada.
      await guardarToken(sesion.token);
      setUsuario(sesion.usuario);
      setBiometriaActiva(await obtenerPreferenciaBiometria(sesion.usuario.id));
      setErrorSesion(null);
      setFase("autenticado");
      return { ok: true };
    } catch {
      setUsuario(null);
      setFase("anonimo");
      return { ok: false, mensaje: "No pudimos guardar tu sesión de forma segura." };
    }
  }

  async function login(datos: CredencialesLogin): Promise<ResultadoAcceso> {
    try {
      const respuesta = await loginServicio(datos);
      if (esError(respuesta)) return { ok: false, mensaje: respuesta.error.mensaje };
      return await completarAcceso(respuesta.datos);
    } catch {
      return { ok: false, mensaje: "No pudimos iniciar sesión." };
    }
  }

  async function registrar(datos: DatosRegistro): Promise<ResultadoAcceso> {
    try {
      const respuesta = await registrarServicio(datos);
      if (esError(respuesta)) return { ok: false, mensaje: respuesta.error.mensaje };
      return await completarAcceso(respuesta.datos);
    } catch {
      return { ok: false, mensaje: "No pudimos completar el registro." };
    }
  }

  async function logout() {
    // Si no se puede limpiar SecureStore, no aparentar que salió correctamente.
    await borrarToken();
    setUsuario(null);
    setBiometriaActiva(false);
    setErrorSesion(null);
    setFase("anonimo");
  }

  async function usarOtraCuenta() {
    await logout();
  }

  async function desbloquear(): Promise<ResultadoBiometria> {
    if (fase !== "bloqueado" || !usuario) {
      return { exito: false, motivo: "fallido" };
    }
    const resultado = await autenticarConBiometria();
    if (resultado.exito) setFase("autenticado");
    return resultado;
  }

  async function cambiarBiometria(habilitada: boolean): Promise<ResultadoAcceso> {
    if (!usuario || fase !== "autenticado") {
      return { ok: false, mensaje: "Primero iniciá sesión." };
    }
    try {
      if (habilitada) {
        if (!(await haySoporteBiometrico())) {
          return {
            ok: false,
            mensaje: "Este dispositivo no tiene huella o rostro configurados.",
          };
        }
        // Verificar identidad antes de habilitar desbloqueo futuro.
        const verificacion = await autenticarConBiometria();
        if (!verificacion.exito) {
          return { ok: false, mensaje: "No pudimos confirmar tu identidad." };
        }
      }
      await guardarPreferenciaBiometria(usuario.id, habilitada);
      setBiometriaActiva(habilitada);
      return { ok: true };
    } catch {
      return { ok: false, mensaje: "No pudimos guardar tu preferencia." };
    }
  }

  return (
    <SesionContext.Provider
      value={{
        usuario,
        cargando: fase === "cargando",
        fase,
        errorSesion,
        biometriaActiva,
        login,
        registrar,
        logout,
        usarOtraCuenta,
        reintentarRestauracion: restaurar,
        desbloquear,
        cambiarBiometria,
      }}
    >
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) {
    throw new Error("useSesion debe usarse dentro de SesionProvider");
  }
  return contexto;
}
