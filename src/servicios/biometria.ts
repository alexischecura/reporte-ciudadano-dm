import * as LocalAuthentication from "expo-local-authentication";

export interface ResultadoBiometria {
  exito: boolean;
  motivo?: "sin_hardware" | "sin_registro" | "cancelado";
}

export async function haySoporteBiometrico(): Promise<boolean> {
  const tieneHardware = await LocalAuthentication.hasHardwareAsync();
  if (!tieneHardware) return false;

  const tieneRegistrado = await LocalAuthentication.isEnrolledAsync();
  return tieneRegistrado;
}

export async function autenticarConBiometria(): Promise<ResultadoBiometria> {
  const soportado = await haySoporteBiometrico();

  if (!soportado) {
    return { exito: false, motivo: "sin_hardware" };
  }

  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: "Confirmá tu identidad para continuar",
    cancelLabel: "Cancelar",
    disableDeviceFallback: false,
  });

  if (resultado.success) {
    return { exito: true };
  }

  return { exito: false, motivo: "cancelado" };
}
