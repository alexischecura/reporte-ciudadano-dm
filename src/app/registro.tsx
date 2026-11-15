import { StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { FormularioAcceso } from "@/components/formulario-acceso";
import { Spacing } from "@/constants/theme";
import { useSesion } from "@/contexts/sesion-context";
import { useTheme } from "@/hooks/use-theme";
import { router } from "expo-router";
import { useRef, useState } from "react";

export default function RegistroScreen() {
  const colors = useTheme();
  const passwordRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const telefonoRef = useRef<TextInput>(null);
  const { registrar } = useSesion();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleRegistro() {
    if (enviando) return;
    setError(null);
    if (!nombre.trim() || !email.trim() || !password) {
      setError("Completá nombre, email y contraseña.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Ingresá un correo válido.");
      return;
    }
    setEnviando(true);
    try {
      const resultado = await registrar({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim() || null,
        password,
      });
      if (!resultado.ok) {
        setError(resultado.mensaje ?? "No se pudo crear la cuenta.");
      }
      // Stack.Protected navega automáticamente cuando se actualiza la sesión.
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <FormularioAcceso>
      <ThemedText type="title" style={styles.title}>Crear cuenta</ThemedText>
      <TextInput style={[styles.input, { borderColor: colors.backgroundSelected, color: colors.text }]}
        accessibilityLabel="Nombre completo"
        autoCapitalize="words" returnKeyType="next" submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
        placeholder="Nombre completo" placeholderTextColor={colors.textSecondary}
        value={nombre} onChangeText={setNombre} autoComplete="name" />
      <TextInput style={[styles.input, { borderColor: colors.backgroundSelected, color: colors.text }]}
        ref={emailRef} accessibilityLabel="Email" autoCorrect={false}
        returnKeyType="next" submitBehavior="submit"
        onSubmitEditing={() => telefonoRef.current?.focus()}
        placeholder="Email" placeholderTextColor={colors.textSecondary}
        value={email} onChangeText={setEmail} autoCapitalize="none"
        autoComplete="email" keyboardType="email-address" />
      <TextInput style={[styles.input, { borderColor: colors.backgroundSelected, color: colors.text }]}
        ref={telefonoRef} accessibilityLabel="Teléfono (opcional)" autoComplete="tel"
        returnKeyType="next" submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        placeholder="Teléfono (opcional)" placeholderTextColor={colors.textSecondary}
        value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
      <TextInput style={[styles.input, { borderColor: colors.backgroundSelected, color: colors.text }]}
        ref={passwordRef} accessibilityLabel="Contraseña"
        autoCapitalize="none" autoCorrect={false} returnKeyType="go"
        onSubmitEditing={() => void handleRegistro()}
        placeholder="Contraseña" placeholderTextColor={colors.textSecondary}
        value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      {error && <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.error, { color: colors.error }]}>{error}</ThemedText>}
      <TouchableOpacity style={[styles.boton, { backgroundColor: colors.text }]}
        onPress={() => void handleRegistro()} disabled={enviando} accessibilityRole="button"
        accessibilityState={{ disabled: enviando, busy: enviando }}>
        <ThemedText style={{ color: colors.background }}>
          {enviando ? "Creando cuenta..." : "Registrarme"}
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity style={styles.enlace} accessibilityRole="link" onPress={() => router.push("/login")}>
        <ThemedText style={styles.link}>¿Ya tenés cuenta? Iniciá sesión</ThemedText>
      </TouchableOpacity>
    </FormularioAcceso>
  );
}

const styles = StyleSheet.create({
  enlace: { minHeight: 48, justifyContent: "center" },

  title: { textAlign: "center", marginBottom: Spacing.three },
  input: { minHeight: 48, fontSize: 16, borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.three },
  boton: { minHeight: 48, padding: Spacing.three, borderRadius: Spacing.two, alignItems: "center" },
  error: { color: "#D32F2F", textAlign: "center" },
  link: { textAlign: "center", marginTop: Spacing.two },
});
