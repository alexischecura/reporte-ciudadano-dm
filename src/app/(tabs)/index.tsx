import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ThemedView } from "@/components/themed-view";
import { useSesion } from "@/contexts/sesion-context";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { usuario, logout } = useSesion();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.greeting}>
              {usuario ? `Hola, ${usuario.nombre}` : "Bienvenido"}
            </Text>

            <Pressable
              onPress={logout}
              accessibilityRole="button"
              style={styles.logoutButton}
            >
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Link href="/seguridad" asChild>
              <Pressable style={styles.actionButton} accessibilityRole="button">
                <Text style={styles.actionText}>Seguridad de la cuenta</Text>
              </Pressable>
            </Link>

            <Link href="/reportar" asChild>
              <Pressable style={styles.actionButton} accessibilityRole="button">
                <Text style={styles.actionText}>Crear reporte</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 28,
  },

  header: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },

  greeting: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
    color: "#202020",
  },

  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: "center",
  },

  logoutText: {
    fontSize: 16,
    color: "#208AEF",
    textAlign: "center",
  },

  actions: {
    width: "100%",
    gap: 16,
  },

  actionButton: {
    width: "100%",
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: "#208AEF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  actionText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
    flexWrap: "wrap",
    width: "100%",
  },
});
