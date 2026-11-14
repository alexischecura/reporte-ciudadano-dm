import type { NotificationResponse } from "expo-notifications";
import { useEffect } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";

import { useSesion } from "@/contexts/sesion-context";
import { admitePush, registrarNotificaciones } from "@/servicios/notificaciones";

export function GestorNotificaciones() {
  const { fase, usuario } = useSesion();

  useEffect(() => {
    if (fase !== "autenticado" || !usuario || !admitePush()) return;
    let activo = true;
    let silenciar = () => {};
    const suscripciones: { remove(): void }[] = [];
    const registrar = () => {
      if (usuario.avisosActivos) void registrarNotificaciones().catch(() => undefined);
    };
    registrar();
    const appState = AppState.addEventListener("change", (estado) => {
      if (estado === "active") registrar();
    });
    void import("expo-notifications").then(async (Notifications) => {
      if (!activo) return;
      silenciar = () => Notifications.setNotificationHandler({
        handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false }),
      });
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: usuario.avisosActivos,
          shouldSetBadge: false,
          shouldShowBanner: usuario.avisosActivos,
          shouldShowList: usuario.avisosActivos,
        }),
      });
      const abrir = (respuesta: NotificationResponse) => {
        if (!activo) return;
        const datos = respuesta.notification.request.content.data;
        if (usuario.rol === "vecino" && typeof datos?.reporteId === "string") {
          router.push("/(tabs)/seguimiento");
        }
        void Notifications.clearLastNotificationResponseAsync();
      };
      suscripciones.push(Notifications.addNotificationResponseReceivedListener(abrir));
      suscripciones.push(Notifications.addPushTokenListener(() => registrar()));
      const ultima = await Notifications.getLastNotificationResponseAsync();
      if (ultima) abrir(ultima);
    }).catch(() => undefined);
    return () => {
      activo = false;
      appState.remove();
      suscripciones.forEach((suscripcion) => suscripcion.remove());
      silenciar();
    };
  }, [fase, usuario]);

  return null;
}
