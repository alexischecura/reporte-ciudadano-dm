import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { Usuario } from "@/tipos";
import { ApiError, request } from "./http";
import { obtenerToken } from "./sesion";

const CLAVE_PUSH = "reporte-ciudadano-push";
let cola: Promise<unknown> = Promise.resolve();

// Serializar altas y bajas para que una petición tardía no registre el teléfono tras salir.
function serializar<T>(operacion: () => Promise<T>): Promise<T> {
  const resultado = cola.then(operacion);
  cola = resultado.catch(() => undefined);
  return resultado;
}

export function admitePush() {
  return Platform.OS !== "web" && Constants.executionEnvironment !== "storeClient";
}

export function mensajeNotificaciones(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 501) return "El servidor todavía no tiene habilitadas las notificaciones.";
    return error.message;
  }
  return error instanceof Error ? error.message : "No pudimos configurar las notificaciones.";
}

export function registrarNotificaciones(pedirPermiso = false): Promise<boolean> {
  return serializar(async () => {
    if (!admitePush()) {
      if (pedirPermiso) throw new Error("Usá una compilación propia de la app en Android o iPhone para recibir avisos.");
      return false;
    }
    const token = await obtenerToken();
    if (!token) return false;
    const Notifications = await import("expo-notifications");
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Avisos de reportes",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted && pedirPermiso && permiso.canAskAgain) {
      permiso = await Notifications.requestPermissionsAsync();
    }
    const permitido = permiso.granted || permiso.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!permitido) {
      if (pedirPermiso) throw new Error("Permití las notificaciones en los ajustes del teléfono para recibir avisos.");
      return false;
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) throw new Error("Falta configurar el proyecto de notificaciones.");
    const { data: tokenExpo } = await Notifications.getExpoPushTokenAsync({ projectId });
    const anterior = await SecureStore.getItemAsync(CLAVE_PUSH);
    if (anterior && anterior !== tokenExpo) {
      await request(`/dispositivos/${encodeURIComponent(anterior)}`, { method: "DELETE", token });
    }
    // Conservarlo incluso si el POST falla: permite reintentar la baja al salir.
    await SecureStore.setItemAsync(CLAVE_PUSH, tokenExpo);
    await request("/dispositivos", {
      method: "POST", token,
      body: JSON.stringify({ tokenExpo, plataforma: Platform.OS }),
    });
    return true;
  });
}

export function darDeBajaNotificaciones(): Promise<void> {
  return serializar(async () => {
    if (Platform.OS === "web") return;
    const tokenExpo = await SecureStore.getItemAsync(CLAVE_PUSH);
    const token = await obtenerToken();
    if (!tokenExpo) return;
    if (token) {
      try {
        await request(`/dispositivos/${encodeURIComponent(tokenExpo)}`, { method: "DELETE", token });
      } catch (error) {
        // Una sesión vencida o el módulo aún sin implementar no deben impedir salir.
        if (!(error instanceof ApiError) || ![401, 501].includes(error.status)) throw error;
      }
    }
    await SecureStore.deleteItemAsync(CLAVE_PUSH);
  });
}

export async function guardarAvisos(avisosActivos: boolean): Promise<Usuario> {
  const token = await obtenerToken();
  if (!token) throw new Error("Primero iniciá sesión.");
  return request<Usuario>("/yo", { method: "PATCH", token, body: JSON.stringify({ avisosActivos }) });
}

export async function probarNotificaciones(): Promise<number> {
  const token = await obtenerToken();
  if (!token) throw new Error("Primero iniciá sesión.");
  const resultado = await request<{ enviadas: number }>("/dispositivos/prueba", { method: "POST", token });
  return resultado.enviadas;
}
