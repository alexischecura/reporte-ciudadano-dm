import {
  CredencialesLogin,
  DatosRegistro,
  SesionUsuario,
  login as loginServicio,
  registrar as registrarServicio,
  validarToken,
} from "@/servicios/auth";
import {
  ResultadoBiometria,
  autenticarConBiometria,
  haySoporteBiometrico,
} from "@/servicios/biometria";
import {
  darDeBajaNotificaciones,
  guardarAvisos,
} from "@/servicios/notificaciones";
import {
  guardarPreferenciaBiometria,
  obtenerPreferenciaBiometria,
} from "@/servicios/preferencias";
import {
  borrarToken,
  guardarToken,
  obtenerToken,
  guardarUsuarioSesion,
} from "@/servicios/sesion";
import {
  cargarSesionGuardada,
  type SesionRestaurada,
} from "@/servicios/restauracion-sesion";
import { Usuario } from "@/tipos";
import { esError } from "@/tipos/api";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type FaseSesion =
  "cargando" | "anonimo" | "bloqueado" | "sin_conexion" | "autenticado";

type ResultadoAcceso = { ok: boolean; mensaje?: string };

interface SesionContextType {
  usuario: Usuario | null;
  cargando: boolean;
  fase: FaseSesion;
  errorSesion: string | null;
  biometriaActiva: boolean;
  modoOffline: boolean;
  verificarConexion: () => Promise<boolean>;
  login: (datos: CredencialesLogin) => Promise<ResultadoAcceso>;
  registrar: (datos: DatosRegistro) => Promise<ResultadoAcceso>;
  logout: () => Promise<void>;
  usarOtraCuenta: () => Promise<void>;
  reintentarRestauracion: () => Promise<void>;
  desbloquear: () => Promise<ResultadoBiometria>;
  cambiarAvisos: (habilitada: boolean) => Promise<void>;
  cambiarBiometria: (habilitada: boolean) => Promise<ResultadoAcceso>;
}

const SesionContext = createContext<SesionContextType | undefined>(undefined);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [fase, setFase] = useState<FaseSesion>("cargando");
  const [errorSesion, setErrorSesion] = useState<string | null>(null);
  const [biometriaActiva, setBiometriaActiva] = useState(false);
  const [modoOffline, setModoOffline] = useState(false);

  const aplicarRestauracion = useCallback((sesion: SesionRestaurada) => {
    setUsuario(sesion.usuario);
    setFase(sesion.fase);
    setErrorSesion(sesion.error);
    setBiometriaActiva(sesion.biometriaActiva);
    setModoOffline(sesion.modoOffline);
  }, []);

  const reintentarRestauracion = async () => {
    setFase("cargando");
    aplicarRestauracion(await cargarSesionGuardada());
  };

  const verificarConexion = useCallback(async () => {
    const token = await obtenerToken();
    if (!token) return false;
    const respuesta = await validarToken(token);
    if ((await obtenerToken()) !== token) return false;
    if (esError(respuesta)) {
      if (respuesta.error.codigo === "NO_AUTENTICADO") {
        await borrarToken();
        setUsuario(null);
        setFase("anonimo");
      } else setModoOffline(true);
      return false;
    }
    await guardarUsuarioSesion(respuesta.datos, token);
    setUsuario(respuesta.datos);
    setModoOffline(false);
    return true;
  }, []);

  useEffect(() => {
    let activo = true;
    void cargarSesionGuardada().then((sesion) => {
      if (activo) aplicarRestauracion(sesion);
    });
    return () => {
      activo = false;
    };
  }, [aplicarRestauracion]);

  async function completarAcceso(
    sesion: SesionUsuario,
  ): Promise<ResultadoAcceso> {
    try {
      await guardarToken(sesion.token);
      await guardarUsuarioSesion(sesion.usuario, sesion.token);
    } catch (error) {
      console.error("[SESION] Error al guardar el token:", error);

      setUsuario(null);
      setBiometriaActiva(false);
      setFase("anonimo");

      return {
        ok: false,
        mensaje: "No pudimos guardar tu sesión de forma segura.",
      };
    }

    let preferenciaBiometria = false;

    try {
      preferenciaBiometria = await obtenerPreferenciaBiometria(
        sesion.usuario.id,
      );
    } catch (error) {
      console.warn(
        "[SESION] No se pudo leer la preferencia biométrica:",
        error,
      );
    }

    setModoOffline(false);
    setUsuario(sesion.usuario);
    setBiometriaActiva(preferenciaBiometria);
    setErrorSesion(null);
    setFase("autenticado");

    return { ok: true };
  }

  async function login(datos: CredencialesLogin): Promise<ResultadoAcceso> {
    try {
      const respuesta = await loginServicio(datos);
      if (esError(respuesta))
        return { ok: false, mensaje: respuesta.error.mensaje };
      return await completarAcceso(respuesta.datos);
    } catch {
      return { ok: false, mensaje: "No pudimos iniciar sesión." };
    }
  }

  async function registrar(datos: DatosRegistro): Promise<ResultadoAcceso> {
    try {
      const respuesta = await registrarServicio(datos);
      if (esError(respuesta))
        return { ok: false, mensaje: respuesta.error.mensaje };
      return await completarAcceso(respuesta.datos);
    } catch {
      return { ok: false, mensaje: "No pudimos completar el registro." };
    }
  }

  async function logout() {
    // Si no se puede limpiar SecureStore, no aparentar que salió correctamente.
    await darDeBajaNotificaciones();
    await borrarToken();
    setUsuario(null);
    setBiometriaActiva(false);
    setErrorSesion(null);
    setFase("anonimo");
  }

  async function cambiarAvisos(habilitada: boolean) {
    const actualizado = await guardarAvisos(habilitada);
    await guardarUsuarioSesion(actualizado);
    setUsuario(actualizado);
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

  async function cambiarBiometria(
    habilitada: boolean,
  ): Promise<ResultadoAcceso> {
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
        modoOffline,
        verificarConexion,
        login,
        registrar,
        logout,
        usarOtraCuenta,
        reintentarRestauracion,
        desbloquear,
        cambiarBiometria,
        cambiarAvisos,
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
