import * as SplashScreen from "expo-splash-screen";

import { SesionProvider, useSesion } from "@/contexts/sesion-context";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { ActivityIndicator, useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { ThemedView } from "@/components/themed-view";

void SplashScreen.preventAutoHideAsync();

function NavegacionSegunSesion() {
  const { usuario, fase } = useSesion();

  if (fase === "cargando") {
    return (
      <ThemedView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  const autenticado = fase === "autenticado" && !!usuario;

  const esVecino = autenticado && usuario?.rol === "vecino";

  const esOperador = autenticado && usuario?.rol === "operador";

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />

      {/* Rutas disponibles sin iniciar sesión */}
      <Stack.Protected guard={fase === "anonimo"}>
        <Stack.Screen name="login" />
        <Stack.Screen name="registro" />
      </Stack.Protected>

      {/* Reingreso mediante biometría */}
      <Stack.Protected guard={fase === "bloqueado"}>
        <Stack.Screen name="desbloquear" />
      </Stack.Protected>

      {/* Recuperación de sesión sin conexión */}
      <Stack.Protected guard={fase === "sin_conexion"}>
        <Stack.Screen name="recuperar-sesion" />
      </Stack.Protected>

      {/* Rutas exclusivas para vecinos */}
      <Stack.Protected guard={esVecino}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="reportar" />
      </Stack.Protected>

      {/* Rutas exclusivas para operadores */}

      <Stack.Protected guard={esOperador}>
        <Stack.Screen name="operador" />
        <Stack.Screen name="operador-perfil" />
      </Stack.Protected>

      {/* Seguridad disponible para usuarios autenticados */}
      <Stack.Protected guard={autenticado}>
        <Stack.Screen name="seguridad" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SesionProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <NavegacionSegunSesion />
      </ThemeProvider>
    </SesionProvider>
  );
}
