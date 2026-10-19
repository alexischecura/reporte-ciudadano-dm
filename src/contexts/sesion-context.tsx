import {
  CredencialesLogin,
  login as loginServicio,
  validarToken,
} from "@/servicios/auth";
import {
  autenticarConBiometria,
  haySoporteBiometrico,
} from "@/servicios/biometria";
import { borrarToken, guardarToken, obtenerToken } from "@/servicios/sesion";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { Usuario } from "@/tipos";
import { esError } from "@/tipos/api";

interface SesionContextType {
  usuario: Usuario | null;
  cargando: boolean;
  login: (
    credenciales: CredencialesLogin,
  ) => Promise<{ ok: boolean; mensaje?: string }>;
  logout: () => Promise<void>;
}

const SesionContext = createContext<SesionContextType | undefined>(undefined);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function restaurarSesion() {
      const token = await obtenerToken();

      if (!token) {
        setCargando(false);
        return;
      }

      const haySoporte = await haySoporteBiometrico();

      if (haySoporte) {
        const resultadoBiometria = await autenticarConBiometria();
        if (!resultadoBiometria.exito) {
          setCargando(false);
          return;
        }
      }

      const resultado = await validarToken(token);

      if (esError(resultado)) {
        await borrarToken();
        setCargando(false);
        return;
      }

      setUsuario(resultado.datos);
      setCargando(false);
    }
    restaurarSesion();
  }, []);

  async function login(credenciales: CredencialesLogin) {
    const resultado = await loginServicio(credenciales);

    if (esError(resultado)) {
      return { ok: false, mensaje: resultado.error.mensaje };
    }

    await guardarToken(resultado.datos.token);
    setUsuario(resultado.datos.usuario);
    return { ok: true };
  }

  async function logout() {
    await borrarToken();
    setUsuario(null);
  }

  return (
    <SesionContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (contexto === undefined) {
    throw new Error("useSesion tiene que usarse dentro de un SesionProvider");
  }
  return contexto;
}
