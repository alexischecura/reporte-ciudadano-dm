import * as SecureStore from "expo-secure-store";

import { Platform } from "react-native";

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
}

export async function haySesionActiva(): Promise<boolean> {
  const token = await obtenerToken();
  return token !== null;
}
