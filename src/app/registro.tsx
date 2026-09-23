import { StyleSheet, TextInput, TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useSesion } from "@/contexts/sesion-context";
import { useTheme } from "@/hooks/use-theme";
import { registrar } from "@/servicios/auth";
import { esError } from "@/tipos/api";
import { router } from "expo-router";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RegistroScreen() {
  const colors = useTheme();
  const { login } = useSesion();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);

  async function handleRegistro() {
    setError(null);

    if (!nombre.trim() || !email.trim() || !password) {
      setError("Completá nombre, email y contraseña.");
      return;
    }

    setEnviando(true);

    const resultado = await registrar({
      nombre: nombre.trim(),
      email: email.trim(),
      telefono: telefono.trim() || null,
      password,
    });

    if (esError(resultado)) {
      setEnviando(false);
      setError(resultado.error.mensaje);
      return;
    }

    const resultadoLogin = await login({ email: email.trim(), password });
    setEnviando(false);

    if (!resultadoLogin.ok) {
      setError(
        "Te registraste, pero no pudimos iniciar sesión. Probá loguearte.",
      );
      router.push("/login");
      return;
    }

    setExito(true);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Crear cuenta
        </ThemedText>

        <TextInput
          style={[
            styles.input,
            { borderColor: colors.backgroundSelected, color: colors.text },
          ]}
          placeholder="Nombre completo"
          placeholderTextColor={colors.textSecondary}
          value={nombre}
          onChangeText={setNombre}
        />

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
          placeholder="Teléfono (opcional)"
          placeholderTextColor={colors.textSecondary}
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
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
        {exito && (
          <ThemedText style={{ color: "green", textAlign: "center" }}>
            ¡Cuenta creada con éxito!
          </ThemedText>
        )}

        <TouchableOpacity
          style={[styles.boton, { backgroundColor: colors.text }]}
          onPress={handleRegistro}
          disabled={enviando}
        >
          <ThemedText style={{ color: colors.background }}>
            {enviando ? "Creando cuenta..." : "Registrarme"}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/login")}>
          <ThemedText style={styles.link}>
            ¿Ya tenés cuenta? Iniciá sesión
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
  title: { textAlign: "center", marginBottom: Spacing.three },
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
