import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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

import { TextoCorregido } from "@/components/texto-corregido";
import { useFocusEffect } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { vibracionSuave } from "../../utils/haptica";

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

const formatFecha = (fechaIso: string): string => {
  const fecha = new Date(fechaIso);

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
};

export default function SeguimientoVecino(): React.ReactElement {
  const [reporteSeleccionado, setReporteSeleccionado] =
    useState<Reporte | null>(null);
  const [misReportes, setMisReportes] = useState<Reporte[]>([]);
  const [tipos, setTipos] = useState<TipoDeReporte[]>([]);
  const [alturaAyuda, setAlturaAyuda] = useState(48);
  const [historialReporte, setHistorialReporte] = useState<CambioDeEstado[]>(
    [],
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function cargarDatos() {
        try {
          setCargando(true);
          setError(null);

          const [reportes, tiposDisponibles] = await Promise.all([
            listarMisReportes(),
            listarTiposDeReporte(),
          ]);

          if (!activo) return;

          setMisReportes(reportes);

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
    }, []),
  );

  useEffect(() => {
    if (!reporteSeleccionado) return;

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

  const renderItem = ({ item }: { item: Reporte }) => {
    const tipo = getTipoReporte(item.tipoId);
    const estado = estadoConfig[item.estado];

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
              {item.codigo}
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
              {estado.label}
            </TextoCorregido>
          </View>
        </View>

        <View style={styles.metaRow}>
          <TextoCorregido style={styles.metaLabel}>Fecha</TextoCorregido>

          <TextoCorregido style={styles.metaValue}>
            {formatFecha(item.creadoEn)}
          </TextoCorregido>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={async () => {
            await vibracionSuave();
            setHistorialReporte([]);
            setReporteSeleccionado(item);
          }}
          style={styles.primaryButton}
        >
          <TextoCorregido style={styles.primaryButtonText}>
            Ver Seguimiento y QR
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

      {cargando ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#1F6FEB" />

          <TextoCorregido style={styles.loadingText}>
            Cargando tus reclamos
          </TextoCorregido>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            No pudimos cargar tu seguimiento
          </Text>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={misReportes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={reporteSeleccionado !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setReporteSeleccionado(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TextoCorregido style={styles.modalTitle}>
              {reporteSeleccionado?.codigo}
            </TextoCorregido>

            <View style={styles.qrContainer}>
              {reporteSeleccionado && (
                <QRCode
                  value={reporteSeleccionado.codigo}
                  size={200}
                  backgroundColor="white"
                  color="#111827"
                />
              )}
            </View>

            <Text
              style={[styles.helperText, { minHeight: alturaAyuda }]}
              onTextLayout={(evento) => {
                const alturaNecesaria = Math.ceil(
                  evento.nativeEvent.lines.length * 22 + 4,
                );

                if (alturaNecesaria > alturaAyuda) {
                  setAlturaAyuda(alturaNecesaria);
                }
              }}
            >
              Muestre este código en ventanilla para consultar su trámite.
            </Text>

            <View style={styles.timelineContainer}>
              <Text style={styles.timelineTitle}>Seguimiento</Text>

              {(historialReporte.length > 0 ? historialReporte : []).map(
                (cambio, index, items) => (
                  <React.Fragment key={cambio.id}>
                    <View style={styles.timelineRow}>
                      <View
                        style={[
                          styles.timelineDot,
                          cambio.estado === reporteSeleccionado?.estado &&
                            styles.timelineDotActive,
                        ]}
                      />
                      <View style={styles.timelineTextWrap}>
                        <TextoCorregido style={styles.timelineText}>
                          {estadoConfig[cambio.estado]?.label ?? cambio.estado}
                        </TextoCorregido>

                        {cambio.comentario ? (
                          <Text style={styles.timelineComment}>
                            {cambio.comentario}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {index < items.length - 1 ? (
                      <View style={styles.timelineLine} />
                    ) : null}
                  </React.Fragment>
                ),
              )}

              {historialReporte.length === 0 && reporteSeleccionado && (
                <View style={styles.timelineRow}>
                  <View
                    style={[styles.timelineDot, styles.timelineDotActive]}
                  />
                  <View style={styles.timelineTextWrap}>
                    <TextoCorregido style={styles.timelineText}>
                      {estadoConfig[reporteSeleccionado.estado]?.label ??
                        reporteSeleccionado.estado}
                    </TextoCorregido>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={async () => {
                await vibracionSuave();
                setReporteSeleccionado(null);
              }}
              style={styles.closeButton}
            >
              <TextoCorregido style={styles.closeButtonText}>
                Cerrar
              </TextoCorregido>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    paddingRight: 4,
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
    color: "#374151",
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
    color: "#111827",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
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
    color: "#111827",
    flexShrink: 1,
    paddingRight: 4,
    includeFontPadding: true,
  },
  codigoTexto: {
    fontSize: 12,
    color: "#6B7280",
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
    color: "#6B7280",
    flexShrink: 1,
    paddingRight: 4,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    textAlign: "right",
    flexShrink: 0,
    paddingHorizontal: 4,
    includeFontPadding: true,
  },
  primaryButton: {
    backgroundColor: "#1F6FEB",
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 18,
  },
  qrContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  helperText: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  timelineContainer: {
    width: "100%",
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginTop: 6,
  },
  timelineDotActive: {
    backgroundColor: "#1F6FEB",
  },
  timelineTextWrap: {
    flex: 1,
    gap: 4,
  },
  timelineText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  timelineComment: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
  },
  timelineLine: {
    width: 2,
    height: 16,
    backgroundColor: "#D1D5DB",
    marginLeft: 4,
    marginVertical: 4,
  },
  closeButton: {
    width: "100%",
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 4,
  },
});
