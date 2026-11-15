import * as SecureStore from "expo-secure-store";

import { Platform } from "react-native";

const AMBITO_API = process.env.EXPO_PUBLIC_API_URL ?? "sin-api";
const CLAVE_TOKEN = "reporte-ciudadano-token";

export async function guardarToken(token: string): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(CLAVE_TOKEN, token);
}

export async function obtenerToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  return await SecureStore.getItemAsync(CLAVE_TOKEN);
}

export async function borrarToken(): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.deleteItemAsync(CLAVE_TOKEN);
  await SecureStore.deleteItemAsync(CLAVE_PERFIL);
}

export async function haySesionActiva(): Promise<boolean> {
  const token = await obtenerToken();
  return token !== null;
}

const CLAVE_PERFIL = "reporte-ciudadano-perfil";

/** Vincular el perfil al token evita recuperar otra cuenta tras un cierre intermedio. */
export async function guardarUsuarioSesion(
  usuario: import("../tipos").Usuario,
  tokenEsperado?: string,
): Promise<void> {
  if (Platform.OS === "web") return;
  const token = await obtenerToken();
  if (!token || (tokenEsperado && token !== tokenEsperado))
    throw new Error("La sesión cambió antes de guardar el perfil.");
  await SecureStore.setItemAsync(
    CLAVE_PERFIL,
    JSON.stringify({ token, usuario, servidor: AMBITO_API }),
  );
}

export async function obtenerUsuarioGuardado(): Promise<
  import("../tipos").Usuario | null
> {
  if (Platform.OS === "web") return null;
  const token = await obtenerToken();
  const raw = await SecureStore.getItemAsync(CLAVE_PERFIL);
  if (!token || !raw) return null;
  const perfil = JSON.parse(raw);
  return perfil.token === token &&
    perfil.servidor === AMBITO_API &&
    typeof perfil.usuario?.id === "string"
    ? perfil.usuario
    : null;
}
