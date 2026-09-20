import * as SecureStore from "expo-secure-store";

const CLAVE_TOKEN = "reporte-ciudadano-token";

export async function guardarToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(CLAVE_TOKEN, token);
}

export async function obtenerToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(CLAVE_TOKEN);
}

export async function borrarToken(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_TOKEN);
}

export async function haySesionActiva(): Promise<boolean> {
  const token = await obtenerToken();
  return token !== null;
}
