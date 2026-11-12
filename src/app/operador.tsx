import { Link } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useSesion } from "@/contexts/sesion-context";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ListaReportesOperador from "@/components/operador/ListaReportesOperador";

export default function OperadorScreen() {
  return <ListaReportesOperador />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  link: { textDecorationLine: "underline" },
});
