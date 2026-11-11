import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";

// La preferencia es pública. Nunca guardar un token o contraseña acá.
const claveBiometria = (usuarioId: string) => `biometria-habilitada:${usuarioId}`;

export async function obtenerPreferenciaBiometria(usuarioId: string): Promise<boolean> {
  if (Platform.OS === "web") return false;
  return (await Storage.getItem(claveBiometria(usuarioId))) === "true";
}

export async function guardarPreferenciaBiometria(
  usuarioId: string,
  habilitada: boolean,
): Promise<void> {
  if (Platform.OS === "web") return;
  await Storage.setItem(claveBiometria(usuarioId), habilitada ? "true" : "false");
}
