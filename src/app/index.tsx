import { Redirect } from "expo-router";
import { useSesion } from "@/contexts/sesion-context";

export default function RootIndexRedirect() {
  const { usuario, fase } = useSesion();
  if (fase === "cargando") return null;
  if (fase === "sin_conexion") return <Redirect href="/recuperar-sesion" />;
  if (fase === "bloqueado") return <Redirect href="/desbloquear" />;
  if (fase === "anonimo" || !usuario) return <Redirect href="/login" />;
  return usuario.rol === "operador" ? (
    <Redirect href="/operador" />
  ) : (
    <Redirect href="/(tabs)" />
  );
}
