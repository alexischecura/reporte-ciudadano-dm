import { useTheme } from "@/hooks/use-theme";
import type { ThemeColors } from "@/constants/theme";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSesion } from "@/contexts/sesion-context";

export default function RecuperarSesionScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { errorSesion, reintentarRestauracion, usarOtraCuenta } = useSesion();
  const [ocupado, setOcupado] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  async function ejecutar(accion: () => Promise<void>) {
    if (ocupado) return;
    setOcupado(true);
    setErrorLocal(null);
    try { await accion(); }
    catch { setErrorLocal("La operación falló. Volvé a intentarlo."); }
    finally { setOcupado(false); }
  }
  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.caja}>
        <Text style={styles.titulo}>No pudimos comprobar tu sesión</Text>
        <Text style={styles.descripcion}>
          {errorSesion ?? "El servidor no respondió."} Tu sesión sigue guardada; no es necesario registrarte nuevamente.
        </Text>
        {errorLocal && <Text style={styles.error}>{errorLocal}</Text>}
        <Pressable style={styles.boton} disabled={ocupado} onPress={() => void ejecutar(reintentarRestauracion)}>
          {ocupado ? <ActivityIndicator color="white" /> : <Text style={styles.textoBoton}>Reintentar conexión</Text>}
        </Pressable>
        <Pressable style={styles.secundario} disabled={ocupado} onPress={() => void ejecutar(usarOtraCuenta)}>
          <Text style={styles.textoSecundario}>Ingresar con otra cuenta</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: 24 },
  caja: { backgroundColor: colors.surface, borderRadius: 18, padding: 24, gap: 18 },
  titulo: { fontWeight: "700", fontSize: 24, color: colors.text, textAlign: "center" },
  descripcion: { fontSize: 16, color: colors.textSecondary, textAlign: "center" },
  error: { color: colors.error, textAlign: "center" },
  boton: { backgroundColor: colors.primaryBackground, borderRadius: 10, padding: 16, alignItems: "center" },
  textoBoton: { color: "white", fontWeight: "700" },
  secundario: { borderColor: colors.primary, borderWidth: 1, borderRadius: 10, padding: 15, alignItems: "center" },
  textoSecundario: { color: colors.primary, fontWeight: "600" },
});
