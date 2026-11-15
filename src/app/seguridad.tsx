import { useTheme } from "@/hooks/use-theme";
import type { ThemeColors } from "@/constants/theme";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSesion } from "@/contexts/sesion-context";
import { router } from "expo-router";

export default function SeguridadScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { usuario, biometriaActiva, cambiarBiometria } = useSesion();
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  async function alternar() {
    if (ocupado) return;
    setOcupado(true);
    setMensaje(null);
    try {
      const resultado = await cambiarBiometria(!biometriaActiva);
      setMensaje(resultado.ok ? "Preferencia actualizada." : resultado.mensaje ?? "No se pudo actualizar.");
    } finally { setOcupado(false); }
  }
  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.caja}>
        <Text style={styles.titulo}>Seguridad de tu cuenta</Text>
        <Text style={styles.descripcion}>{usuario?.email}</Text>
        <Text style={styles.descripcion}>
          El token se guarda de forma segura en el dispositivo. Podés requerir huella o rostro al volver a abrir la aplicación.
        </Text>
        <Text style={styles.estado}>Desbloqueo biométrico: {biometriaActiva ? "activado" : "desactivado"}</Text>
        {!!mensaje && <Text style={styles.mensaje}>{mensaje}</Text>}
        <Pressable style={styles.boton} disabled={ocupado} onPress={() => void alternar()}>
          {ocupado ? <ActivityIndicator color="white" /> : (
            <Text style={styles.botonTxt}>{biometriaActiva ? "Desactivar biometría" : "Activar biometría"}</Text>
          )}
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.volver}>
          <Text style={styles.volverTxt}>Volver</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: 24 },
  caja: { backgroundColor: colors.surface, borderRadius: 18, padding: 24, gap: 18 },
  titulo: { fontSize: 24, fontWeight: "700", color: colors.text, textAlign: "center" },
  descripcion: { color: colors.textSecondary, fontSize: 16, textAlign: "center" },
  estado: { fontSize: 16, fontWeight: "600", color: colors.text, textAlign: "center" },
  mensaje: { fontSize: 14, color: colors.primary, textAlign: "center" },
  boton: { backgroundColor: colors.primaryBackground, padding: 16, borderRadius: 10, alignItems: "center" },
  botonTxt: { color: "white", fontWeight: "700" },
  volver: { alignItems: "center", padding: 12 },
  volverTxt: { color: colors.primary, fontWeight: "600" },
});
