import { DetalleReporteModal } from "@/components/reportes/detalle-reporte-modal";
import { useTheme } from "@/hooks/use-theme";
import type { ThemeColors } from "@/constants/theme";
import React, {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  listarMisReportes,
  listarTiposDeReporte,
  obtenerCambiosDeReporte,
} from "../../servicios/reportes";
import type { CambioDeEstado, Reporte, TipoDeReporte } from "../../tipos";

import { useSesion } from "@/contexts/sesion-context";
import {
  colaReportes,
  leerEstadoLocal,
  misReportesLocales,
} from "@/servicios/offline/reportes-locales";
import {
  revisionLocal,
  suscribirDatosLocales,
} from "@/servicios/offline/persistencia";
import { tiposGuardados } from "@/servicios/offline/catalogo";
import { TextoCorregido } from "@/components/texto-corregido";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { vibracionSuave } from "../../utils/haptica";

type FiltroVecino =
  | "todos"
  | "pendientes"
  | "recibido"
  | "en_revision"
  | "asignado"
  | "resuelto"
  | "rechazado";

const estadoConfig: Record<
  Reporte["estado"],
  { label: string; color: string; backgroundColor: string }
> = {
  recibido: { label: "Recibido", color: "#A35C00", backgroundColor: "#FFF0D9" },
  en_revision: {
    label: "En revisión",
    color: "#00579A",
    backgroundColor: "#DFF3FF",
  },
  asignado: { label: "Asignado", color: "#0B6E4F", backgroundColor: "#D9F7ED" },
  resuelto: { label: "Resuelto", color: "#155724", backgroundColor: "#D4EDDA" },
  rechazado: {
    label: "Rechazado",
    color: "#6C757D",
    backgroundColor: "#E9ECEF",
  },
};

const filtroVecinoLabels: { value: FiltroVecino; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendientes", label: "Pendientes de envío" },
  { value: "recibido", label: "Recibidos" },
  { value: "en_revision", label: "En revisión" },
  { value: "asignado", label: "Asignados" },
  { value: "resuelto", label: "Resueltos" },
  { value: "rechazado", label: "Rechazados" },
];

const formatFecha = (fechaIso: string): string => {
  const fecha = new Date(fechaIso);

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
};

export default function SeguimientoVecino(): React.ReactElement {
  const colors = useTheme();
  const styles = createStyles(colors);
  const [reporteSeleccionado, setReporteSeleccionado] =
    useState<Reporte | null>(null);
  const { usuario, modoOffline } = useSesion();
  const usuarioId = usuario?.id;
  const revision = useSyncExternalStore(
    suscribirDatosLocales,
    revisionLocal,
    revisionLocal,
  );
  void revision;
  const misReportes = usuarioId ? misReportesLocales(usuarioId) : [];
  const enviosLocales = usuarioId ? leerEstadoLocal(usuarioId).envios : [];
  const [tipos, setTipos] = useState<TipoDeReporte[]>([]);
  const [filtroActivo, setFiltroActivo] = useState<FiltroVecino>("todos");
  const [historialReporte, setHistorialReporte] = useState<CambioDeEstado[]>(
    [],
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!usuarioId) return;
      let activo = true;

      async function cargarDatos() {
        try {
          setCargando(false);
          setTipos(tiposGuardados());
          setError(null);

          const [, tiposDisponibles] = await Promise.all([
            listarMisReportes(),
            listarTiposDeReporte(),
          ]);

          if (!activo) return;

          setTipos(tiposDisponibles);
        } catch {
          if (activo) {
            setError("No se pudieron cargar tus reclamos.");
          }
        } finally {
          if (activo) {
            setCargando(false);
          }
        }
      }

      void cargarDatos();

      return () => {
        activo = false;
      };
    }, [usuarioId, setError, setTipos, setCargando]),
  );

  useEffect(() => {
    if (!reporteSeleccionado?.sincronizado) return;

    let activo = true;

    const reporteActual = reporteSeleccionado;

    async function cargarHistorial() {
      try {
        const cambios = await obtenerCambiosDeReporte(reporteActual.id);
        if (!activo) return;
        setHistorialReporte(
          [...cambios].sort(
            (a, b) =>
              new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime(),
          ),
        );
      } catch {
        if (activo) setHistorialReporte([]);
      }
    }

    void cargarHistorial();
    return () => {
      activo = false;
    };
  }, [reporteSeleccionado]);

  const getTipoReporte = (tipoId: string) =>
    tipos.find((tipo) => tipo.id === tipoId) ?? null;

  // Filtrar reportes según la pestaña seleccionada
  const reportesFiltrados = misReportes.filter((reporte) => {
    if (filtroActivo === "todos") return true;
    if (filtroActivo === "pendientes") return !reporte.sincronizado;
    return reporte.sincronizado && reporte.estado === filtroActivo;
  });

  const renderItem = ({ item }: { item: Reporte }) => {
    const tipo = getTipoReporte(item.tipoId);
    const estado = estadoConfig[item.estado];
    const envio = enviosLocales.find((e) => e.id === item.id);
    const etiqueta = item.sincronizado
      ? estado.label
      : envio?.estado === "enviando"
        ? "Enviando"
        : envio?.estado === "error" || envio?.estado === "sesion"
          ? "Revisar envío"
          : "Pendiente de envío";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleWrap}>
            <Text style={styles.tipoTexto}>{tipo?.nombre ?? "Reporte"}</Text>

            <Text
              style={styles.codigoTexto}
              textBreakStrategy="simple"
              android_hyphenationFrequency="none"
            >
              {item.codigo || "Código disponible al confirmarse el envío"}
            </Text>
          </View>

          <View
            style={[
              styles.badge,
              {
                backgroundColor: estado.backgroundColor,
              },
            ]}
          >
            <TextoCorregido style={[styles.badgeText, { color: estado.color }]}>
              {etiqueta}
            </TextoCorregido>
          </View>
        </View>

        <View style={styles.metaRow}>
          <TextoCorregido style={styles.metaLabel}>Fecha</TextoCorregido>

          <TextoCorregido style={styles.metaValue}>
            {formatFecha(item.creadoEn)}
          </TextoCorregido>
        </View>

        {!item.sincronizado && (
          <View style={{ gap: 8, marginBottom: 12 }}>
            <Text>{item.direccion}</Text>
            {item.fotos[0] && (
              <Image
                source={{ uri: item.fotos[0].url }}
                style={{ width: "100%", height: 120, borderRadius: 8 }}
              />
            )}
            <Text>
              {envio?.error ??
                "Guardado en este teléfono. Se enviará automáticamente al recuperar conexión mientras uses la app."}
            </Text>
          </View>
        )}
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!item.sincronizado && envio?.estado === "enviando"}
          onPress={async () => {
            if (!item.sincronizado && usuarioId) {
              if (envio?.estado === "error") {
                const corregir = (reemplazar = false) => {
                  try {
                    colaReportes.corregir(usuarioId, item.id, reemplazar);
                    router.push("/reportar");
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "No pudimos recuperar el reporte para corregirlo.",
                    );
                  }
                };
                const otro = leerEstadoLocal(usuarioId).borrador;
                if (
                  otro &&
                  (otro.tipoId ||
                    otro.descripcion ||
                    otro.fotos.length ||
                    otro.audioUrl ||
                    otro.ubicacion)
                ) {
                  Alert.alert(
                    "¿Reemplazar el borrador actual?",
                    "Se descartará el borrador que estabas completando para corregir este reporte. Los demás envíos se conservan.",
                    [
                      { text: "Conservar", style: "cancel" },
                      {
                        text: "Reemplazar borrador",
                        style: "destructive",
                        onPress: () => corregir(true),
                      },
                    ],
                  );
                } else corregir();
                return;
              }
              try {
                colaReportes.reintentar(usuarioId, item.id);
              } catch {
                setError(
                  "No pudimos guardar el reintento. Tus archivos se conservan.",
                );
              }
              return;
            }
            await vibracionSuave();
            setHistorialReporte([]);
            setReporteSeleccionado(item);
          }}
          style={styles.primaryButton}
        >
          <TextoCorregido style={styles.primaryButtonText}>
            {item.sincronizado
              ? "Ver Seguimiento y QR"
              : envio?.estado === "error"
                ? "Corregir reporte"
                : "Reintentar envío"}
          </TextoCorregido>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Reclamos</Text>
      </View>

      {modoOffline && (
        <Text style={{ padding: 12 }}>
          Sin conexión. Mostramos los reclamos guardados en este teléfono.
        </Text>
      )}
      {error && misReportes.length > 0 && (
        <Text style={{ padding: 12 }}>
          {error} Conservamos tus reportes locales.
        </Text>
      )}
      {/* FILTROS HORIZONTALES PARA EL VECINO */}
      <View style={styles.filtrosContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtroScrollContent}
        >
          {filtroVecinoLabels.map((filtro) => {
            const activo = filtroActivo === filtro.value;
            return (
              <TouchableOpacity
                key={filtro.value}
                onPress={() => setFiltroActivo(filtro.value)}
                activeOpacity={0.85}
                style={[
                  styles.filtroButton,
                  activo && styles.filtroButtonActivo,
                ]}
              >
                <TextoCorregido
                  style={[
                    styles.filtroTexto,
                    activo && styles.filtroTextoActivo,
                  ]}
                >
                  {filtro.label}
                </TextoCorregido>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {cargando ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#1F6FEB" />

          <TextoCorregido style={styles.loadingText}>
            Cargando tus reclamos
          </TextoCorregido>
        </View>
      ) : error && misReportes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            No pudimos cargar tu seguimiento
          </Text>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : reportesFiltrados.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No hay reclamos en este estado</Text>
          <Text style={styles.emptyText}>
            Probá cambiando de filtro o creando un nuevo reporte.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reportesFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {reporteSeleccionado && (
        <DetalleReporteModal
          visible
          reporte={reporteSeleccionado}
          tipo={getTipoReporte(reporteSeleccionado.tipoId)}
          historialReporte={historialReporte}
          onCerrar={() => setReporteSeleccionado(null)}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    paddingRight: 4,
  },
  filtrosContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
  filtroScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filtroButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.backgroundElement,
  },
  filtroTexto: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  filtroButtonActivo: {
    backgroundColor: colors.primaryBackground,
  },
  filtroTextoActivo: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  tipoTexto: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
    paddingRight: 4,
    includeFontPadding: true,
  },
  codigoTexto: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
    flexShrink: 0,
    minWidth: 76,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 3,
    includeFontPadding: true,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    flexShrink: 1,
    paddingRight: 4,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    textAlign: "right",
    flexShrink: 0,
    paddingHorizontal: 4,
    includeFontPadding: true,
  },
  primaryButton: {
    backgroundColor: colors.primaryBackground,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
    flexShrink: 1,
    paddingHorizontal: 5,
    includeFontPadding: true,
  },
});
