import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { TextoCorregido } from "@/components/texto-corregido";
import { useSesion } from "@/contexts/sesion-context";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PerfilScreen() {
  const { usuario, logout } = useSesion();

  const cerrarSesion = () => {
    Alert.alert(
      "Cerrar sesión",
      "¿Querés cerrar tu sesión en este dispositivo?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: () => {
            void logout();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mi perfil</Text>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {usuario?.nombre?.charAt(0).toUpperCase() ?? "U"}
            </Text>
          </View>

          <Text style={styles.name}>{usuario?.nombre ?? "Usuario"}</Text>

          <TextoCorregido style={styles.email}>
            {usuario?.email ?? "Sin correo disponible"}
          </TextoCorregido>

          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {usuario?.rol === "operador" ? "Operador." : "Vecino."}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Mi cuenta</Text>

        <Pressable
          style={styles.option}
          onPress={() => router.push("/seguridad")}
          accessibilityRole="button"
        >
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Seguridad de la cuenta</Text>
            <Text style={styles.optionSubtitle}>
              Biometría y opciones de acceso
            </Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          style={styles.logoutButton}
          onPress={cerrarSesion}
          accessibilityRole="button"
        >
          <TextoCorregido style={styles.logoutText}>
            Cerrar sesión
          </TextoCorregido>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#208AEF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  name: {
    fontSize: 21,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  email: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },

  roleBadge: {
    backgroundColor: "#E8F3FF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 8,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },

  roleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#208AEF",
    textAlign: "center",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
  },
  option: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 1,
  },
  optionContent: {
    flex: 1,
    gap: 4,
    paddingRight: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  optionSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  chevron: {
    fontSize: 26,
    color: "#9CA3AF",
  },
  logoutButton: {
    marginTop: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
  },
  logoutText: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 16,
  },
});
