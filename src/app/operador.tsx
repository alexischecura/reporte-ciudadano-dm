import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useSesion } from "@/contexts/sesion-context";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OperadorScreen() {
  const { usuario, logout } = useSesion();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Bandeja del Operador</ThemedText>
        <ThemedText>
          Bienvenido, {usuario?.nombre}. Pantalla real pendiente de integrar
          (Frank).
        </ThemedText>
        <ThemedText onPress={logout} style={styles.link}>
          Cerrar sesión
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  link: { textDecorationLine: "underline" },
});
