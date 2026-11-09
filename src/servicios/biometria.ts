import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

export type MotivoBiometria =
  | "sin_hardware"
  | "sin_registro"
  | "cancelado"
  | "fallido";

export type ResultadoBiometria =
  | { exito: true }
  | { exito: false; motivo: MotivoBiometria };

export async function haySoporteBiometrico(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const tieneHardware = await LocalAuthentication.hasHardwareAsync();
  return tieneHardware && (await LocalAuthentication.isEnrolledAsync());
}

export async function autenticarConBiometria(): Promise<ResultadoBiometria> {
  if (Platform.OS === "web") return { exito: false, motivo: "sin_hardware" };
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) {
      return { exito: false, motivo: "sin_hardware" };
    }
    if (!(await LocalAuthentication.isEnrolledAsync())) {
      return { exito: false, motivo: "sin_registro" };
    }
    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: "Desbloquear Reporte Ciudadano",
      cancelLabel: "Cancelar",
      disableDeviceFallback: false,
    });
    if (resultado.success) return { exito: true };
    if (["user_cancel", "system_cancel", "app_cancel"].includes(resultado.error)) {
      return { exito: false, motivo: "cancelado" };
    }
    return { exito: false, motivo: "fallido" };
  } catch {
    return { exito: false, motivo: "fallido" };
  }
}
