import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { Usuario } from "@/tipos";
import { ApiError, request } from "./http";
import { obtenerToken } from "./sesion";

const CLAVE_PUSH = "reporte-ciudadano-push";
const CLAVE_BAJAS = "reporte-ciudadano-bajas-push";
const SERVIDOR = process.env.EXPO_PUBLIC_API_URL ?? "";
const TIMEOUT_PUSH = 4000;
let generacion = 0;
let almacenamiento: Promise<unknown> = Promise.resolve();
function guardarLocal<T>(operacion: () => Promise<T>): Promise<T> {
  const resultado = almacenamiento.then(operacion);
  almacenamiento = resultado.catch(() => undefined);
  return resultado;
}
type BajaPendiente = { tokenExpo: string; token: string; servidor: string };
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
  const inicio = generacion;
  return serializar(async () => {
    if (inicio !== generacion) return false;
    await procesarBajas();
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
    if (inicio !== generacion || token !== await obtenerToken()) return false;
    const pendientes = await guardarLocal(leerBajas);
    if (pendientes.some((bja) => bja.servidor === SERVIDOR && bja.tokenExpo === tokenExpo)) {
      throw new Error("La baja de avisos de la cuenta anterior sigue pendiente. Reintentaremos al volver a abrir la app.");
    }
    const anterior = await SecureStore.getItemAsync(CLAVE_PUSH);
    if (anterior && anterior !== tokenExpo) {
      await request(`/dispositivos/${encodeURIComponent(anterior)}`, { method: "DELETE", token, timeoutMs: TIMEOUT_PUSH });
    }
    if (inicio !== generacion) return false;
    // Conservarlo incluso si el POST falla: permite reintentar la baja al salir.
    await guardarLocal(async () => {
      if (inicio === generacion) await SecureStore.setItemAsync(CLAVE_PUSH, tokenExpo);
    });
    if (inicio !== generacion) return false;
    await request("/dispositivos", {
      method: "POST", token, timeoutMs: TIMEOUT_PUSH,
      body: JSON.stringify({ tokenExpo, plataforma: Platform.OS }),
    });
    return true;
  });
}

async function leerBajas(): Promise<BajaPendiente[]> {
  const raw = await SecureStore.getItemAsync(CLAVE_BAJAS);
  return raw ? JSON.parse(raw) : [];
}

async function procesarBajas(): Promise<void> {
  if (Platform.OS === "web") return;
  const pendientes = await guardarLocal(leerBajas);
  for (const baja of pendientes) {
    if (baja.servidor !== SERVIDOR) {
      continue;
    }
    try {
      await request(`/dispositivos/${encodeURIComponent(baja.tokenExpo)}`, {
        method: "DELETE", token: baja.token, timeoutMs: TIMEOUT_PUSH,
      });
    } catch (error) {
      if (!(error instanceof ApiError) || ![401, 404, 501].includes(error.status)) {
        continue;
      }
    }
    await guardarLocal(async () => {
      const restantes = (await leerBajas()).filter((item) =>
        item.token !== baja.token || item.tokenExpo !== baja.tokenExpo || item.servidor !== baja.servidor);
      if (restantes.length) await SecureStore.setItemAsync(CLAVE_BAJAS, JSON.stringify(restantes));
      else await SecureStore.deleteItemAsync(CLAVE_BAJAS);
    });
  }
}

export function reintentarBajasNotificaciones(): Promise<void> {
  return serializar(procesarBajas);
}

// Sólo espera almacenamiento local. La red continúa después de borrar la sesión.
export async function darDeBajaNotificaciones(): Promise<void> {
  generacion += 1;
  if (Platform.OS === "web") return;
  await guardarLocal(async () => {
    const tokenExpo = await SecureStore.getItemAsync(CLAVE_PUSH);
    const token = await obtenerToken();
    if (tokenExpo && token) {
      const pendientes = await leerBajas();
      if (!pendientes.some((baja) => baja.token === token && baja.tokenExpo === tokenExpo && baja.servidor === SERVIDOR)) {
        pendientes.push({ tokenExpo, token, servidor: SERVIDOR });
      }
      await SecureStore.setItemAsync(CLAVE_BAJAS, JSON.stringify(pendientes));
    }
    await SecureStore.deleteItemAsync(CLAVE_PUSH);
  });
  void reintentarBajasNotificaciones().catch(() => undefined);
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
