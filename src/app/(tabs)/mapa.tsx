// 🔴 TODO: Codigo repetido con src/componentes/SeguimientoVecino.tsx (tarjetas y qr), refactorizar a un componente comun.

import * as Location from "expo-location";
import { FiltrosMapa } from "@/components/reportes/filtros-mapa";
import { filtrarReportesMapa, RADIO_EXPLORACION_METROS } from "@/utils/ubicacion";
import { useSesion } from "@/contexts/sesion-context";
import type { CambioDeEstado, Coordenadas, EstadoReporte, Reporte, TipoDeReporte } from "@/tipos";
import { vibracionSuave } from "@/utils/haptica";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  Marker,
  Circle,
  PROVIDER_GOOGLE,
  type Region,
} from "react-native-maps";
import QRCode from "react-native-qrcode-svg";

import {
  adherirseAReporte,
  listarReportesDelMapa,
  listarTiposDeReporte,
  obtenerCambiosDeReporte,
  obtenerEstadoAdhesionReporte,
  obtenerReporte,
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

  const mapRef = useRef<MapView>(null);
  const [tipoFiltro, setTipoFiltro] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoReporte | null>(null);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [cercaDe, setCercaDe] = useState<Coordenadas | null>(null);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
  const [permisoBloqueado, setPermisoBloqueado] = useState(false);
  const visibles = filtrarReportesMapa(reportes, tipoFiltro, estadoFiltro, cercaDe);

  const mostrarCercanos = async () => {
    setErrorUbicacion(null);
    setPermisoBloqueado(false);
    setSeleccionado(null);
    if (cercaDe) {
      setCercaDe(null);
      return;
    }
    setBuscandoUbicacion(true);
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!permiso.granted) {
        setPermisoBloqueado(!permiso.canAskAgain);
        setErrorUbicacion("Permití el acceso a la ubicación para ver reportes cerca de vos. Podés seguir explorando todos los reportes.");
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCercaDe({ latitud: coords.latitude, longitud: coords.longitude });
      mapRef.current?.animateToRegion({
        latitude: coords.latitude, longitude: coords.longitude,
        latitudeDelta: 0.025, longitudeDelta: 0.025,
      }, 350);
    } catch {
      setErrorUbicacion("No pudimos obtener tu ubicación. Revisá que el GPS esté activado e intentá nuevamente.");
    } finally {
      setBuscandoUbicacion(false);
    }
  };

  const cargarDatos = useCallback(async (estaActivo: () => boolean = () => true) => {
    try {
      setError(null);
      setCargando(true);
      const [reportesApi, tiposApi] = await Promise.all([
        listarReportesDelMapa(), listarTiposDeReporte(),
      ]);
      if (!estaActivo()) return;
      setReportes(reportesApi);
      setTipos(tiposApi);
      setSeleccionado((anterior) => anterior
        ? (reportesApi.find((reporte) => reporte.id === anterior.id) ?? null)
        : null);
    } catch {
      if (estaActivo()) setError("No se pudieron cargar los reportes del mapa.");
    } finally {
      if (estaActivo()) setCargando(false);
    }
  }, []);

  // Actualizar los marcadores al volver a esta pestaña.
  useFocusEffect(useCallback(() => {
    let activo = true;
    void cargarDatos(() => activo);
    return () => { activo = false; };
  }, [cargarDatos]));

  return (
    <View style={styles.container}>
      <FiltrosMapa
        tipos={tipos}
        tipoId={tipoFiltro}
        estado={estadoFiltro}
        abiertos={filtrosAbiertos}
        cerca={cercaDe !== null}
        buscandoUbicacion={buscandoUbicacion}
        errorUbicacion={errorUbicacion}
        permisoBloqueado={permisoBloqueado}
        cargando={cargando}
        sinResultados={!cargando && !error && !visibles.length}
        cantidad={visibles.length}
        onTipo={(tipoId) => { setTipoFiltro(tipoId); setSeleccionado(null); }}
        onEstado={(estado) => { setEstadoFiltro(estado); setSeleccionado(null); }}
        onAlternar={() => setFiltrosAbiertos(!filtrosAbiertos)}
        onCercania={() => void mostrarCercanos()}
        onLimpiar={() => {
          setTipoFiltro(null);
          setEstadoFiltro(null);
          setCercaDe(null);
          setSeleccionado(null);
          setErrorUbicacion(null);
          setPermisoBloqueado(false);
        }}
      />
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={CENTRO_GUALEGUAYCHU}
        toolbarEnabled={false}
        onPress={() => setSeleccionado(null)}
      >
        {cercaDe && <>
          <Circle center={{ latitude: cercaDe.latitud, longitude: cercaDe.longitud }} radius={RADIO_EXPLORACION_METROS} strokeColor="#208AEF" fillColor="rgba(32,138,239,0.08)" />
          <Marker coordinate={{ latitude: cercaDe.latitud, longitude: cercaDe.longitud }} title="Tu ubicación" pinColor="#208AEF" />
        </>}
        {!cargando &&
          visibles.map((reporte) => {
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

      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            style={styles.limpiarFiltros}
            onPress={() => void cargarDatos()}
          >
            <Text style={styles.filtroTexto}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {seleccionado && (
        <TarjetaReporte
          key={seleccionado.id}
          reporte={seleccionado}
          tipos={tipos}
          onObtenerDetalle={obtenerReporte}
          onObtenerHistorial={obtenerCambiosDeReporte}
          onAdherirse={adherirseAReporte}
          onActualizarReporte={(reporteActualizado) => {
            setReportes((prev) =>
              prev.map((item) =>
                item.id === reporteActualizado.id ? reporteActualizado : item,
              ),
            );
            setSeleccionado((prev) =>
              prev && prev.id === reporteActualizado.id
                ? reporteActualizado
                : prev,
            );
          }}
        />
      )}
    </View>
  );
}

const TarjetaReporte = ({
  reporte,
  tipos,
  onObtenerDetalle,
  onObtenerHistorial,
  onAdherirse,
  onActualizarReporte,
}: {
  reporte: Reporte;
  tipos: TipoDeReporte[];
  onObtenerDetalle: (reporteId: string) => Promise<Reporte>;
  onObtenerHistorial: (reporteId: string) => Promise<CambioDeEstado[]>;
  onAdherirse: (reporteId: string) => Promise<Reporte>;
  onActualizarReporte: (reporteActualizado: Reporte) => void;
}) => {
  const { usuario } = useSesion();
  const tipo = tipos.find((item) => item.id === reporte.tipoId) ?? null;
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleReporte, setDetalleReporte] = useState<Reporte | null>(null);
  const [historialReporte, setHistorialReporte] = useState<CambioDeEstado[]>(
    [],
  );
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [cargandoAdhesion, setCargandoAdhesion] = useState(false);
  const [adherido, setAdherido] = useState(false);

  const reporteActual = detalleReporte ?? reporte;
  const fotosValidas = (reporteActual.fotos ?? []).filter((foto) =>
    Boolean(foto?.url?.trim()),
  );
  const estado = estadoConfig[reporteActual.estado];
  const puedeAdherirse =
    !!usuario &&
    usuario.id !== reporteActual.autorId &&
    !cargandoAdhesion &&
    !adherido &&
    !cargandoAdhesion;

  useEffect(() => {
    if (!detalleVisible) return;

    let activo = true;

    async function cargarDetalle() {
      try {
        setCargandoDetalle(true);
        const detalle = await onObtenerDetalle(reporte.id);
        if (!activo) return;
        setDetalleReporte(detalle);
      } catch {
        if (activo) {
          setDetalleReporte(reporte);
        }
      } finally {
        if (activo) setCargandoDetalle(false);
      }
    }

    async function cargarHistorial() {
      try {
        const cambios = await onObtenerHistorial(reporte.id);
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

    async function cargarEstadoAdhesion() {
      if (!usuario || usuario.id === reporte.autorId) {
        setAdherido(false);
        return;
      }

      try {
        setCargandoAdhesion(true);
        const estadoAdhesion = await obtenerEstadoAdhesionReporte(reporte.id);
        if (!activo) return;
        setAdherido(estadoAdhesion);
      } catch {
        if (activo) setAdherido(false);
      } finally {
        if (activo) setCargandoAdhesion(false);
      }
    }

    void cargarDetalle();
    void cargarHistorial();
    void cargarEstadoAdhesion();

    return () => {
      activo = false;
    };
  }, [detalleVisible, onObtenerDetalle, onObtenerHistorial, reporte, usuario]);

  const cerrarDetalle = () => {
    setDetalleVisible(false);
    setDetalleReporte(null);
    setHistorialReporte([]);
  };

  const abrirDetalle = async () => {
    await vibracionSuave();
    setDetalleReporte(null);
    setHistorialReporte([]);
    setDetalleVisible(true);
  };

  const manejarAdhesion = async () => {
    if (!usuario || usuario.id === reporteActual.autorId) return;

    try {
      setCargandoAdhesion(true);
      const actualizado = await onAdherirse(reporteActual.id);
      setDetalleReporte(actualizado);
      setAdherido(true);
      onActualizarReporte(actualizado);
    } catch {
      // No se muestra error adicional para evitar romper el flujo del modal.
    } finally {
      setCargandoAdhesion(false);
    }
  };

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
        onPress={abrirDetalle}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>Ver detalle y QR</Text>
      </TouchableOpacity>

      <Modal
        visible={detalleVisible}
        transparent
        animationType="slide"
        onRequestClose={cerrarDetalle}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              <Text style={styles.modalTitle}>{reporteActual.codigo}</Text>

              {cargandoDetalle ? (
                <View style={styles.loadingDetalle}>
                  <ActivityIndicator size="small" color="#1F6FEB" />
                  <Text style={styles.loadingText}>Cargando detalle…</Text>
                </View>
              ) : (
                <>
                  <View style={styles.heroRow}>
                    <View style={styles.heroInfo}>
                      <Text style={styles.heroTipo}>
                        {tipo?.nombre ?? "Reporte"}
                      </Text>
                      <Text style={styles.heroMeta}>
                        {formatFecha(reporteActual.creadoEn)}
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
                      <Text style={[styles.badgeText, { color: estado.color }]}>
                        {estado.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.sectionLabel}>Reporte</Text>
                  <Text style={styles.descriptionText}>
                    {reporteActual.descripcion || "Sin descripción adicional."}
                  </Text>

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailBox}>
                      <Text style={styles.detailLabel}>Dirección</Text>
                      <Text style={styles.detailValue}>
                        {reporteActual.direccion}
                      </Text>
                    </View>
                    <View style={styles.detailBox}>
                      <Text style={styles.detailLabel}>Adhesiones</Text>
                      <Text style={styles.detailValue}>
                        {reporteActual.adhesiones}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.qrContainer}>
                    <QRCode
                      value={reporteActual.id}
                      size={180}
                      backgroundColor="white"
                      color="#111827"
                    />
                  </View>

                  <Text style={styles.helperText}>
                    Muestre este código en ventanilla para consultar su trámite.
                  </Text>

                  <Text style={styles.sectionLabel}>Fotos</Text>
                  {fotosValidas.length > 0 ? (
                    <View style={styles.fotosGrid}>
                      {fotosValidas.map((foto) => (
                        <View key={foto.id} style={styles.fotoFrame}>
                          <Image
                            source={{ uri: foto.url }}
                            style={styles.foto}
                            resizeMode="cover"
                            accessibilityIgnoresInvertColors
                          />
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>
                      Este reporte no tiene fotos.
                    </Text>
                  )}

                  {usuario &&
                  usuario.id !== reporteActual.autorId &&
                  adherido ? (
                    <Text style={styles.estadoAdhesionText}>
                      Ya estás adherido a este reporte.
                    </Text>
                  ) : null}

                  {usuario &&
                  usuario.id !== reporteActual.autorId &&
                  !adherido ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={async () => {
                        await vibracionSuave();
                        await manejarAdhesion();
                      }}
                      style={[
                        styles.adherirButton,
                        !puedeAdherirse && styles.adherirButtonDisabled,
                      ]}
                      disabled={!puedeAdherirse}
                    >
                      <Text style={styles.adherirButtonText}>
                        {cargandoAdhesion
                          ? "Adhiriendo..."
                          : "Adherirme a este reporte"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {!usuario ? (
                    <Text style={styles.emptyText}>
                      Iniciá sesión para adherirte a este reporte.
                    </Text>
                  ) : null}

                  {usuario && usuario.id === reporteActual.autorId ? (
                    <Text style={styles.emptyText}>
                      Este reporte es tuyo, así que no podés adherirte.
                    </Text>
                  ) : null}

                  <View style={styles.timelineContainer}>
                    <Text style={styles.timelineTitle}>Seguimiento</Text>

                    {(historialReporte.length > 0 ? historialReporte : []).map(
                      (cambio, index, items) => (
                        <React.Fragment key={cambio.id}>
                          <View style={styles.timelineRow}>
                            <View
                              style={[
                                styles.timelineDot,
                                cambio.estado === reporteActual.estado &&
                                  styles.timelineDotActive,
                              ]}
                            />
                            <View style={styles.timelineTextWrap}>
                              <Text style={styles.timelineText}>
                                {estadoConfig[cambio.estado]?.label ??
                                  cambio.estado}
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

                    {historialReporte.length === 0 && reporteActual && (
                      <View style={styles.timelineRow}>
                        <View
                          style={[styles.timelineDot, styles.timelineDotActive]}
                        />
                        <View style={styles.timelineTextWrap}>
                          <Text style={styles.timelineText}>
                            {estadoConfig[reporteActual.estado]?.label ??
                              reporteActual.estado}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={async () => {
                      await vibracionSuave();
                      cerrarDetalle();
                    }}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
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
  map: { flex: 1 },
  filtroTexto: { color: "#1F6FEB", fontSize: 14, fontWeight: "600" },
  limpiarFiltros: { minHeight: 44, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
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
    maxHeight: "90%",
    width: "100%",
  },
  modalContent: {
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 18,
  },
  loadingDetalle: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    gap: 12,
  },
  heroInfo: {
    flex: 1,
  },
  heroTipo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  heroMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 18,
  },
  detailsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  detailBox: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
  },
  detailLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "700",
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  qrContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    marginBottom: 14,
  },
  helperText: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  fotosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    columnGap: 8,
    rowGap: 8,
  },
  fotoFrame: {
    width: "32%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  foto: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  adherirButton: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 18,
  },
  adherirButtonDisabled: {
    opacity: 0.6,
  },
  adherirButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 18,
  },
  estadoAdhesionText: {
    fontSize: 14,
    color: "#166534",
    fontWeight: "700",
    marginBottom: 18,
    backgroundColor: "#DCFCE7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: "center",
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
