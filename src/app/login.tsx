import { StyleSheet, TextInput, TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useSesion } from "@/contexts/sesion-context";
import { useTheme } from "@/hooks/use-theme";
import { router } from "expo-router";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const colors = useTheme();
  const { login } = useSesion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleLogin() {
    setError(null);
    setEnviando(true);

    const resultado = await login({ email, password });

    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.mensaje ?? "No se pudo iniciar sesión.");
      return;
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Reporte Ciudadano
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Iniciá sesión para continuar
        </ThemedText>

        <TextInput
          style={[
            styles.input,
            { borderColor: colors.backgroundSelected, color: colors.text },
          ]}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={[
            styles.input,
            { borderColor: colors.backgroundSelected, color: colors.text },
          ]}
          placeholder="Contraseña"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        <TouchableOpacity
          style={[styles.boton, { backgroundColor: colors.text }]}
          onPress={handleLogin}
          disabled={enviando}
        >
          <ThemedText style={{ color: colors.background }}>
            {enviando ? "Ingresando..." : "Ingresar"}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/registro")}>
          <ThemedText style={styles.link}>
            ¿No tenés cuenta? Registrate
          </ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center", marginBottom: Spacing.three },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  boton: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
  },
  error: { color: "#D32F2F", textAlign: "center" },
  link: { textAlign: "center", marginTop: Spacing.two },
});
