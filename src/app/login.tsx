import {
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { FormularioAcceso } from "@/components/formulario-acceso";
import { Spacing } from "@/constants/theme";
import { useSesion } from "@/contexts/sesion-context";
import { useTheme } from "@/hooks/use-theme";
import { router } from "expo-router";
import { useRef, useState } from "react";

export default function LoginScreen() {
  const colors = useTheme();
  const passwordRef = useRef<TextInput>(null);
  const { login } = useSesion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleLogin() {
    if (enviando) return;
    setError(null);
    if (!email.trim() || !password) {
      setError("Ingresá tu email y contraseña.");
      return;
    }
    setEnviando(true);
    try {
      const resultado = await login({ email: email.trim(), password });
      if (!resultado.ok)
        setError(resultado.mensaje ?? "No se pudo iniciar sesión.");
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <FormularioAcceso>
      <Image
        source={require("../../assets/images/splash-icon.png")}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Reporte Ciudadano"
      />

      <ThemedText style={styles.subtitle}>
        Iniciá sesión para continuar
      </ThemedText>

      <TextInput
        style={[
          styles.input,
          { borderColor: colors.backgroundSelected, color: colors.text },
        ]}
        accessibilityLabel="Email"
        autoComplete="email"
        autoCorrect={false}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
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
        ref={passwordRef}
        accessibilityLabel="Contraseña"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={() => void handleLogin()}
        placeholder="Contraseña"
        placeholderTextColor={colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error && <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.error, { color: colors.error }]}>{error}</ThemedText>}

      <TouchableOpacity
        style={[styles.boton, { backgroundColor: colors.text }]}
        onPress={handleLogin}
        disabled={enviando} accessibilityRole="button"
        accessibilityState={{ disabled: enviando, busy: enviando }}
      >
        <ThemedText style={{ color: colors.background }}>
          {enviando ? "Ingresando..." : "Ingresar"}
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.enlace} accessibilityRole="link" onPress={() => router.push("/registro")}>
        <ThemedText style={styles.link}>
          ¿No tenés cuenta? Registrate
        </ThemedText>
      </TouchableOpacity>
    </FormularioAcceso>
  );
}

const styles = StyleSheet.create({
  enlace: { minHeight: 48, justifyContent: "center" },
  logo: {
    width: "100%",
    height: 130,
    alignSelf: "center",
    marginBottom: 8,
  },

  subtitle: { textAlign: "center", marginBottom: Spacing.three },
  input: {
    minHeight: 48,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  boton: {
    minHeight: 48,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
  },
  error: { color: "#D32F2F", textAlign: "center" },
  link: { textAlign: "center", marginTop: Spacing.two },
});
