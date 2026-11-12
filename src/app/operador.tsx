import { Pressable, StyleSheet, View } from "react-native";

import ListaReportesOperador from "@/components/operador/ListaReportesOperador";
import { TextoCorregido } from "@/components/texto-corregido";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OperadorScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.header}>
          <TextoCorregido style={styles.title}>
            Bandeja del operador
          </TextoCorregido>

          <Pressable
            onPress={() => router.push("/operador-perfil")}
            style={styles.settingsButton}
            accessibilityRole="button"
            accessibilityLabel="Abrir perfil"
          >
            <Ionicons name="settings-outline" size={24} color="#253046" />
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={styles.content}>
        <ListaReportesOperador />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  safeArea: {
    backgroundColor: "#FFFFFF",
  },
  header: {
    minHeight: 62,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECF0",
  },
  title: {
    fontSize: 21,
    fontWeight: "700",
    color: "#152033",
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F3F7",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
});
