// 🔴 TODO: Codigo repetido con src/componentes/SeguimientoVecino.tsx (tarjetas y qr), refactorizar a un componente comun.

import type { CambioDeEstado, Reporte, TipoDeReporte } from "@/tipos";
import { vibracionSuave } from "@/utils/haptica";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { ComponentProps, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type Region,
} from "react-native-maps";
import QRCode from "react-native-qrcode-svg";

import {
  listarReportes,
  listarTiposDeReporte,
  obtenerCambiosDeReporte,
} from "@/servicios/reportes";

const CENTRO_GUALEGUAYCHU: Region = {
  latitude: -33.0089,
  longitude: -58.5142,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type IconName = ComponentProps<typeof Ionicons>["name"];

export const TIPOS: Record<string, { nombre: string; icono: IconName }> = {
  "tip-bache": { nombre: "Bache", icono: "construct" },
  "tip-luminaria": { nombre: "Luminaria", icono: "bulb" },
  "tip-vereda": { nombre: "Vereda", icono: "walk" },
  "tip-desconocido": { nombre: "Otro", icono: "alert-circle" },
};

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

export default function Mapa() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [tipos, setTipos] = useState<TipoDeReporte[]>([]);
  const [seleccionado, setSeleccionado] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Actualizar los marcadores cada vez que se vuelve a esta pestaña.
  // Conservamos los marcadores anteriores mientras se consulta la API.
  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function cargarDatos() {
        try {
          setError(null);

          const [reportesApi, tiposApi] = await Promise.all([
            listarReportes(),
            listarTiposDeReporte(),
          ]);

          if (!activo) return;

          setReportes(reportesApi);
          setTipos(tiposApi);
          setSeleccionado((anterior) =>
            anterior
              ? (reportesApi.find((reporte) => reporte.id === anterior.id) ??
                null)
              : null,
          );
        } catch {
          if (activo) {
            setError("No se pudieron cargar los reportes del mapa.");
          }
        } finally {
          if (activo) setCargando(false);
        }
      }

      void cargarDatos();

      return () => {
        activo = false;
      };
    }, []),
  );

  const getTipoReporte = (tipoId: string) =>
    tipos.find((tipo) => tipo.id === tipoId) ?? null;

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={CENTRO_GUALEGUAYCHU}
        toolbarEnabled={false}
        onPress={() => setSeleccionado(null)}
      >
        {!cargando &&
          reportes.map((reporte) => {
            const activo = reporte.id === seleccionado?.id;
            const icono =
              TIPOS[reporte.tipoId]?.icono || TIPOS["tip-desconocido"]?.icono;
            const size = activo ? 42 : 32;
            const color = estadoConfig[reporte.estado].color;

            return (
              <Marker
                key={reporte.id}
                coordinate={{
                  latitude: reporte.coordenadas.latitud,
                  longitude: reporte.coordenadas.longitud,
                }}
                title={reporte.codigo}
                anchor={{ x: 0.5, y: 0.5 }}
                onPress={(e) => {
                  e.stopPropagation();
                  setSeleccionado(reporte);
                }}
              >
                <View
                  style={[
                    styles.pin,
                    {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      backgroundColor: color,
                      borderWidth: activo ? 3 : 2,
                    },
                  ]}
                >
                  <Ionicons name={icono} size={activo ? 22 : 17} color="#fff" />
                </View>
              </Marker>
            );
          })}
      </MapView>

      {cargando ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#1F6FEB" />
          <Text style={styles.loadingText}>Cargando reportes…</Text>
        </View>
      ) : error ? (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {seleccionado && (
        <TarjetaReporte
          reporte={seleccionado}
          tipos={tipos}
          onObtenerHistorial={obtenerCambiosDeReporte}
        />
      )}
    </View>
  );
}

const TarjetaReporte = ({
  reporte,
  tipos,
  onObtenerHistorial,
}: {
  reporte: Reporte;
  tipos: TipoDeReporte[];
  onObtenerHistorial: (reporteId: string) => Promise<CambioDeEstado[]>;
}) => {
  const tipo = tipos.find((item) => item.id === reporte.tipoId) ?? null;
  const estado = estadoConfig[reporte.estado];
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [historialReporte, setHistorialReporte] = useState<CambioDeEstado[]>(
    [],
  );

  useEffect(() => {
    if (!detalleVisible) {
      setHistorialReporte([]);
      return;
    }

    async function cargarHistorial() {
      try {
        const cambios = await onObtenerHistorial(reporte.id);
        setHistorialReporte(
          [...cambios].sort(
            (a, b) =>
              new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime(),
          ),
        );
      } catch {
        setHistorialReporte([]);
      }
    }

    void cargarHistorial();
  }, [detalleVisible, onObtenerHistorial, reporte.id]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleWrap}>
          <Text style={styles.tipoTexto}>{tipo?.nombre ?? "Reporte"}</Text>
          <Text style={styles.codigoTexto}>{reporte.codigo}</Text>
        </View>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: estado.backgroundColor,
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: estado.color }]}>
            {estado.label}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Fecha</Text>
        <Text style={styles.metaValue}>{formatFecha(reporte.creadoEn)}</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={async () => {
          await vibracionSuave();
          setDetalleVisible(true);
        }}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>Ver Seguimiento y QR</Text>
      </TouchableOpacity>

      <Modal
        visible={detalleVisible !== false}
        transparent
        animationType="slide"
        onRequestClose={() => setDetalleVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{reporte?.codigo}</Text>

            <View style={styles.qrContainer}>
              <QRCode
                value={reporte.id}
                size={200}
                backgroundColor="white"
                color="#111827"
              />
            </View>

            <Text style={styles.helperText}>
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
                          cambio.estado === reporte?.estado &&
                            styles.timelineDotActive,
                        ]}
                      />
                      <View style={styles.timelineTextWrap}>
                        <Text style={styles.timelineText}>
                          {estadoConfig[cambio.estado]?.label ?? cambio.estado}
                        </Text>
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

              {historialReporte.length === 0 && reporte && (
                <View style={styles.timelineRow}>
                  <View
                    style={[styles.timelineDot, styles.timelineDotActive]}
                  />
                  <View style={styles.timelineTextWrap}>
                    <Text style={styles.timelineText}>
                      {estadoConfig[reporte?.estado]?.label ?? reporte?.estado}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={async () => {
                await vibracionSuave();
                setDetalleVisible(false);
              }}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const formatFecha = (fechaIso: string): string => {
  const fecha = new Date(fechaIso);

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  pin: {
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  loadingOverlay: {
    position: "absolute",
    left: 24,
    right: 24,
    top: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  loadingText: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "600",
  },
  errorOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 120,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    color: "#991B1B",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
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
  },
  tipoTexto: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
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
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  primaryButton: {
    backgroundColor: "#1F6FEB",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
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
  },
});
