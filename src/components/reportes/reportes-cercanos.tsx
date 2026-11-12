import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useSesion } from "@/contexts/sesion-context";
import { useTheme } from "@/hooks/use-theme";
import { adherirseAReporte, obtenerEstadoAdhesionReporte } from "@/servicios/reportes";
import type { Coordenadas, Reporte, TipoDeReporte } from "@/tipos";
import { distanciaMetros, ESTADOS_REPORTE } from "@/utils/ubicacion";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

type Props = {
  reportes: Reporte[];
  tipos: TipoDeReporte[];
  coordenadas: Coordenadas;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  onAdherido: (reporte: Reporte) => void;
  onOcupado: (ocupado: boolean) => void;
};

export function ReportesCercanos({
  reportes, tipos, coordenadas, cargando, error,
  onReintentar, onAdherido, onOcupado,
}: Props) {
  const colores = useTheme();
  const { usuario } = useSesion();
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [errorAdhesion, setErrorAdhesion] = useState<string | null>(null);

  async function sumarse(reporte: Reporte) {
    if (enviandoId) return;
    setEnviandoId(reporte.id);
    setErrorAdhesion(null);
    onOcupado(true);
    try {
      const yaAdherido = await obtenerEstadoAdhesionReporte(reporte.id);
      const actualizado = yaAdherido ? reporte : await adherirseAReporte(reporte.id);
      onAdherido(actualizado);
    } catch {
      setErrorAdhesion("No pudimos registrar tu adhesión. Intentá nuevamente.");
    } finally {
      setEnviandoId(null);
      onOcupado(false);
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.contenedor}>
      <ThemedText style={styles.titulo}>Reportes a 50 m o menos</ThemedText>
      {cargando ? (
        <View style={styles.fila}>
          <ActivityIndicator color={colores.primary} />
          <ThemedText themeColor="textSecondary">Buscando reportes cercanos…</ThemedText>
        </View>
      ) : error ? (
        <>
          <ThemedText themeColor="error" accessibilityLiveRegion="polite">{error}</ThemedText>
          <Pressable accessibilityRole="button" onPress={onReintentar} style={styles.boton}>
            <ThemedText themeColor="primary">Reintentar búsqueda</ThemedText>
          </Pressable>
        </>
      ) : reportes.length === 0 ? (
        <ThemedText themeColor="textSecondary">No hay reclamos abiertos cerca de este punto.</ThemedText>
      ) : (
        <>
          <ThemedText>¿Es el mismo problema? Sumate a un reclamo existente para evitar duplicarlo.</ThemedText>
          {reportes.map((reporte) => {
            const propio = reporte.autorId === usuario?.id;
            const foto = reporte.fotos.find((item) => item.momento === "problema");
            return (
              <ThemedView key={reporte.id} style={[styles.tarjeta, { borderColor: colores.backgroundSelected }]}>
                {foto && <Image source={{ uri: foto.url }} style={styles.foto} accessibilityLabel="Foto del problema reportado" />}
                <ThemedText style={styles.nombre}>
                  {tipos.find((tipo) => tipo.id === reporte.tipoId)?.nombre ?? "Reporte"}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {reporte.codigo} · A {Math.round(distanciaMetros(coordenadas, reporte.coordenadas))} m
                </ThemedText>
                <ThemedText>{reporte.direccion}</ThemedText>
                {reporte.descripcion && <ThemedText numberOfLines={3}>{reporte.descripcion}</ThemedText>}
                <ThemedText themeColor="textSecondary">
                  {ESTADOS_REPORTE.find(({ valor }) => valor === reporte.estado)?.nombre} · {reporte.adhesiones} adhesiones
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  disabled={enviandoId !== null}
                  onPress={() => propio ? router.push("/seguimiento") : void sumarse(reporte)}
                  style={[styles.boton, { backgroundColor: colores.primary, opacity: enviandoId ? 0.6 : 1 }]}
                >
                  {enviandoId === reporte.id ? <ActivityIndicator color="#fff" /> : (
                    <ThemedText style={styles.botonTexto}>{propio ? "Es tu reporte · Ver seguimiento" : "Es el mismo, sumarme"}</ThemedText>
                  )}
                </Pressable>
              </ThemedView>
            );
          })}
        </>
      )}
      {errorAdhesion && <ThemedText themeColor="error" accessibilityLiveRegion="polite">{errorAdhesion}</ThemedText>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: { borderRadius: 14, padding: 16, gap: 12 },
  titulo: { fontSize: 18, fontWeight: "700" },
  nombre: { fontSize: 17, fontWeight: "700" },
  fila: { flexDirection: "row", alignItems: "center", gap: 8 },
  tarjeta: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  foto: { width: "100%", height: 140, borderRadius: 10 },
  boton: { minHeight: 48, borderRadius: 12, padding: 12, alignItems: "center", justifyContent: "center" },
  botonTexto: { color: "#fff", fontWeight: "700", textAlign: "center" },
});
