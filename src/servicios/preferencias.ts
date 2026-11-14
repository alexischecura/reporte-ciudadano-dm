import * as SecureStore from "expo-secure-store";

import { Platform } from "react-native";

const claveBiometria = (usuarioId: string) =>
  `biometria-habilitada_${usuarioId.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

export async function obtenerPreferenciaBiometria(
  usuarioId: string,
): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const valor = await SecureStore.getItemAsync(claveBiometria(usuarioId));

  return valor === "true";
}

export async function guardarPreferenciaBiometria(
  usuarioId: string,
  habilitada: boolean,
): Promise<void> {
  if (Platform.OS === "web") return;

  await SecureStore.setItemAsync(
    claveBiometria(usuarioId),
    habilitada ? "true" : "false",
  );
}
