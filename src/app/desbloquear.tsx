import { useTheme } from "@/hooks/use-theme";
import type { ThemeColors } from "@/constants/theme";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSesion } from "@/contexts/sesion-context";

const mensajes = {
  sin_hardware: "Este teléfono no permite desbloqueo biométrico.",
  sin_registro: "No hay huella o rostro configurados en el teléfono.",
  cancelado: "Cancelaste la autenticación. Podés volver a intentar o usar tu contraseña.",
  fallido: "No pudimos confirmar tu identidad. Intentá nuevamente.",
};

export default function DesbloquearScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { desbloquear, usarOtraCuenta } = useSesion();
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function intentar() {
    if (ocupado) return;
    setOcupado(true);
    setMensaje(null);
    try {
      const r = await desbloquear();
      if (!r.exito) setMensaje(mensajes[r.motivo]);
    } catch {
      setMensaje("No se pudo iniciar la verificación biométrica.");
    } finally {
      setOcupado(false);
    }
  }

  async function ingresarConContrasena() {
    if (ocupado) return;
    setOcupado(true);
    try {
      // No se reutiliza una sesión bloqueada al ingresar con contraseña.
      await usarOtraCuenta();
    } catch {
      setMensaje("No pudimos cerrar la sesión anterior.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.caja}>
        <Text style={styles.titulo}>Desbloquear Reporte Ciudadano</Text>
        <Text style={styles.descripcion}>Confirmá tu identidad para volver a la aplicación.</Text>
        {mensaje && <Text style={styles.error}>{mensaje}</Text>}
        <Pressable style={styles.boton} disabled={ocupado} onPress={() => void intentar()}>
          {ocupado ? <ActivityIndicator color="white" /> : <Text style={styles.textoBoton}>Usar huella o rostro</Text>}
        </Pressable>
        <Pressable style={styles.secundario} disabled={ocupado} onPress={() => void ingresarConContrasena()}>
          <Text style={styles.textoSecundario}>Ingresar con contraseña</Text>
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
