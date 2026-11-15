import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useSyncExternalStore } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ThemeColors } from "@/constants/theme";
import { useSesion } from "@/contexts/sesion-context";
import { useTheme } from "@/hooks/use-theme";
import { revisionLocal, suscribirDatosLocales } from "@/servicios/offline/persistencia";
import { colaReportes, leerEstadoLocal, nuevoBorrador } from "@/servicios/offline/reportes-locales";

const pasos = [
  { icono: "camera-outline", titulo: "Sacá una foto", texto: "Mostrá el problema que encontraste en la vía pública." },
  { icono: "location-outline", titulo: "Ubicá y describí", texto: "Indicá dónde ocurre y agregá una descripción o nota de voz." },
  { icono: "receipt-outline", titulo: "Seguí tu reclamo", texto: "Consultá el estado y el código QR desde Mis Reclamos." },
] as const;

export default function HomeScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { usuario } = useSesion();
  const revision = useSyncExternalStore(suscribirDatosLocales, revisionLocal, revisionLocal);
  void revision;
  const estadoLocal = usuario ? leerEstadoLocal(usuario.id) : null;
  const borrador = estadoLocal?.borrador;
  const hayBorrador = !!borrador && !!(
    borrador.tipoId || borrador.descripcion.trim() || borrador.fotos.length ||
    borrador.audioUrl || borrador.ubicacion
  );
  const pendientes = estadoLocal?.envios.length ?? 0;
  const requierenRevision = estadoLocal?.envios.some(
    (envio) => envio.estado === "error" || envio.estado === "sesion",
  );

  function crearReporte() {
    if (!hayBorrador) {
      router.push("/reportar");
      return;
    }
    Alert.alert(
      "Tenés un borrador guardado",
      "Podés continuarlo o reemplazarlo para empezar un reporte nuevo.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Continuar borrador", onPress: () => router.push("/reportar") },
        {
          text: "Empezar de nuevo",
          style: "destructive",
          onPress: () => {
            if (!usuario) return;
            try {
              colaReportes.guardarBorrador(usuario.id, nuevoBorrador());
              router.push("/reportar");
            } catch {
              Alert.alert("No pudimos iniciar el reporte", "Tu borrador se conserva. Revisá el espacio disponible e intentá nuevamente.");
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{usuario ? `Hola, ${usuario.nombre}` : "Bienvenido"}</Text>
          <Text style={styles.title} accessibilityRole="header">¿Qué problema querés reportar?</Text>
          <Text style={styles.subtitle}>Ayudanos a mejorar los espacios que compartimos.</Text>
        </View>

        <Pressable
          onPress={crearReporte}
          accessibilityRole="button"
          accessibilityLabel="Crear reporte"
          style={({ pressed }) => [styles.mainCard, pressed && styles.pressed]}
        >
          <View style={styles.mainIcon}><Ionicons name="add-circle-outline" size={38} color="#FFFFFF" /></View>
          <Text style={styles.mainTitle}>Crear reporte</Text>
          <Text style={styles.mainDescription}>Adjuntá una foto, indicá dónde ocurre y contanos qué pasó.</Text>
          <View style={styles.mainAction}>
            <Text style={styles.mainActionText}>Empezar</Text>
            <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
          </View>
        </Pressable>

        {hayBorrador && (
          <Link href="/reportar" asChild>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.contextCard, pressed && styles.pressed]}>
              <Ionicons name="create-outline" size={26} color={colors.primary} />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Continuar borrador</Text>
                <Text style={styles.cardDescription}>Tu reporte está guardado en este teléfono. Retomalo donde lo dejaste.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>
          </Link>
        )}

        {pendientes > 0 && (
          <Link href="/(tabs)/seguimiento" asChild>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.contextCard, pressed && styles.pressed]}>
              <Ionicons name={requierenRevision ? "alert-circle-outline" : "cloud-upload-outline"} size={26} color={colors.primary} />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>
                  {pendientes === 1 ? "Tenés 1 reporte pendiente de envío" : `Tenés ${pendientes} reportes pendientes de envío`}
                </Text>
                <Text style={styles.cardDescription}>
                  {requierenRevision ? "Hay envíos que necesitan tu atención. Revisalos en Mis Reclamos." : "Consultá el progreso de los envíos en Mis Reclamos."}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>
          </Link>
        )}

        <View style={styles.guide}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Cómo funciona</Text>
          {pasos.map((paso, indice) => (
            <View key={paso.icono} style={styles.step}>
              <View style={styles.stepIcon}><Ionicons name={paso.icono} size={24} color={colors.primary} /></View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{indice + 1}. {paso.titulo}</Text>
                <Text style={styles.cardDescription}>{paso.texto}</Text>
              </View>
            </View>
          ))}
        </View>

        <Link href="/(tabs)/mapa" asChild>
          <Pressable accessibilityRole="link" style={({ pressed }) => [styles.mapLink, pressed && styles.pressed]}>
            <Ionicons name="map-outline" size={23} color={colors.primary} />
            <View style={styles.cardText}>
              <Text style={styles.linkTitle}>Consultar el mapa antes de reportar</Text>
              <Text style={styles.cardDescription}>Si el problema ya fue informado, podés adherirte al reporte.</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.primary} />
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, width: "100%", maxWidth: 800, alignSelf: "center", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32, gap: 20 },
  header: { gap: 8 },
  greeting: { fontSize: 16, fontWeight: "500", color: colors.textSecondary },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 16, lineHeight: 23, color: colors.textSecondary },
  mainCard: { borderRadius: 24, padding: 24, gap: 12, backgroundColor: colors.primaryBackground },
  mainIcon: { alignSelf: "flex-start", marginBottom: 4 },
  mainTitle: { fontSize: 25, fontWeight: "700", color: "#FFFFFF" },
  mainDescription: { fontSize: 16, lineHeight: 24, color: "#FFFFFF" },
  mainAction: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12 },
  mainActionText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  contextCard: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderRadius: 16, backgroundColor: colors.primaryMuted },
  cardText: { flex: 1, minWidth: 0, gap: 4 },
  cardTitle: { fontSize: 16, lineHeight: 23, fontWeight: "600", color: colors.text },
  cardDescription: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  guide: { gap: 20, paddingVertical: 4 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  stepIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.backgroundElement },
  mapLink: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border },
  linkTitle: { fontSize: 15, lineHeight: 22, fontWeight: "600", color: colors.primary },
  pressed: { opacity: 0.8 },
});
