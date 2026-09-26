import * as SplashScreen from "expo-splash-screen";

import { SesionProvider, useSesion } from "@/contexts/sesion-context";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { ThemedView } from "@/components/themed-view";
import { ActivityIndicator, useColorScheme } from "react-native";

SplashScreen.preventAutoHideAsync();

function NavegacionSegunSesion() {
  const { usuario, cargando } = useSesion();

  if (cargando) {
    return (
      <ThemedView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!usuario}>
        <Stack.Screen name="login" />
        <Stack.Screen name="registro" />
      </Stack.Protected>

      <Stack.Protected guard={!!usuario && usuario.rol === "vecino"}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>

      <Stack.Protected guard={!!usuario && usuario.rol === "operador"}>
        <Stack.Screen name="operador" />
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
