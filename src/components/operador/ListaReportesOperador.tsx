import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { MOCK_CUADRILLAS } from "../../mocks/cuadrillas.mock";
import { MOCK_REPORTES } from "../../mocks/reportes.mock";
import { MOCK_TIPOS_DE_REPORTE } from "../../mocks/tipos-de-reporte.mock";
import { MOCK_ZONAS } from "../../mocks/zonas.mock";
import type { Cuadrilla } from "../../tipos/cuadrilla";
import type { Reporte } from "../../tipos";
import { vibracionExito } from "../../utils/haptica";

type FiltroEstado = "todos" | "pendiente" | "en_progreso" | "resuelto";

const estadoConfig: Record<
  Reporte["estado"],
  { label: string; color: string; backgroundColor: string }
> = {
  recibido: { label: "Pendiente", color: "#A35C00", backgroundColor: "#FFF0D9" },
  en_revision: { label: "En revisión", color: "#00579A", backgroundColor: "#DFF3FF" },
  asignado: { label: "En Progreso", color: "#0B6E4F", backgroundColor: "#D9F7ED" },
  resuelto: { label: "Resuelto", color: "#155724", backgroundColor: "#D4EDDA" },
  rechazado: { label: "Rechazado", color: "#6C757D", backgroundColor: "#E9ECEF" },
};

const filtroLabels: Array<{ value: FiltroEstado; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_progreso", label: "En Progreso" },
  { value: "resuelto", label: "Resuelto" },
];

const formatFecha = (fechaIso: string): string => {
  const fecha = new Date(fechaIso);

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
};

const getTipoReporte = (tipoId: string) =>
  MOCK_TIPOS_DE_REPORTE.find((tipo) => tipo.id === tipoId) ?? null;

const getZona = (zonaId: string) =>
  MOCK_ZONAS.find((zona) => zona.id === zonaId) ?? null;

const obtenerEstadoFiltrado = (estado: Reporte["estado"]): FiltroEstado => {
  if (estado === "resuelto") return "resuelto";
  if (estado === "recibido" || estado === "rechazado") return "pendiente";
  return "en_progreso";
};

export default function ListaReportesOperador(): JSX.Element {
  const [filtroActivo, setFiltroActivo] = useState<FiltroEstado>("todos");
  const [reporteSeleccionado, setReporteSeleccionado] = useState<Reporte | null>(
    null,
  );
  const [nuevoEstado, setNuevoEstado] = useState<Reporte["estado"]>("en_revision");
  const [comentario, setComentario] = useState("");
  const [cuadrillaSeleccionada, setCuadrillaSeleccionada] = useState<string | null>(
    null,
  );
  const [fotoResolucion, setFotoResolucion] = useState<string | null>(null);

  const cuadrillasDisponibles = useMemo(() => {
    if (!reporteSeleccionado) {
      return [];
    }

    return MOCK_CUADRILLAS.filter(
      (cuadrilla) =>
        cuadrilla.zonaId === reporteSeleccionado.zonaId && cuadrilla.activa,
    );
  }, [reporteSeleccionado]);

  const reportesFiltrados = useMemo(() => {
    if (filtroActivo === "todos") {
      return MOCK_REPORTES;
    }

    return MOCK_REPORTES.filter((reporte) => {
      const estadoFiltrado = obtenerEstadoFiltrado(reporte.estado);
      return estadoFiltrado === filtroActivo;
    });
  }, [filtroActivo]);

  const abrirModal = (reporte: Reporte) => {
    setReporteSeleccionado(reporte);
    setNuevoEstado(reporte.estado);
    setComentario("");
    setCuadrillaSeleccionada(null);
    setFotoResolucion(null);
  };

  const cerrarModal = () => {
    setReporteSeleccionado(null);
    setNuevoEstado("en_revision");
    setComentario("");
    setCuadrillaSeleccionada(null);
    setFotoResolucion(null);
  };

  const adjuntarFotoResolucion = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setFotoResolucion(result.assets[0].uri);
      return;
    }

    Alert.alert("Sin imagen", "No se seleccionó ninguna foto del arreglo.");
  };

  const guardarCambioEstado = () => {
    if (!reporteSeleccionado) {
      return;
    }

    if (!comentario.trim()) {
      Alert.alert("Comentario obligatorio", "Debes completar el comentario del operador.");
      return;
    }

    if (nuevoEstado === "asignado" && !cuadrillaSeleccionada) {
      Alert.alert("Cuadrilla requerida", "Debes seleccionar una cuadrilla antes de guardar.");
      return;
    }

    if (nuevoEstado === "resuelto" && !fotoResolucion) {
      Alert.alert("Foto requerida", "Debes adjuntar la foto del arreglo antes de guardar.");
      return;
    }

    console.log("Cambio de estado:", {
      reporteId: reporteSeleccionado.id,
      nuevoEstado,
      comentario: comentario.trim(),
      cuadrillaId: cuadrillaSeleccionada,
      fotoResolucion,
    });

    vibracionExito();
    cerrarModal();
  };

  const renderItem = ({ item }: { item: Reporte }) => {
    const tipo = getTipoReporte(item.tipoId);
    const zona = getZona(item.zonaId);
    const estado = estadoConfig[item.estado];

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => abrirModal(item)}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleWrap}>
            <Text style={styles.tipoTexto}>{tipo?.nombre ?? "Reporte"}</Text>
            <Text style={styles.codigoTexto}>{item.codigo}</Text>
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

        <Text style={styles.descripcionTexto} numberOfLines={2}>
          {item.descripcion ?? "Sin descripción adicional."}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Fecha</Text>
          <Text style={styles.metaValue}>{formatFecha(item.creadoEn)}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Zona</Text>
          <Text style={styles.metaValue}>{zona?.nombre ?? "Sin zona"}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.filtrosContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtroScrollContent}
        >
          {filtroLabels.map((filtro) => {
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
                <Text
                  style={[
                    styles.filtroTexto,
                    activo && styles.filtroTextoActivo,
                  ]}
                >
                  {filtro.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={reportesFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={reporteSeleccionado !== null}
        transparent
        animationType="slide"
        onRequestClose={cerrarModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cambiar estado</Text>

            {reporteSeleccionado && (
              <Text style={styles.modalCodigo}>{reporteSeleccionado.codigo}</Text>
            )}

            <Text style={styles.sectionTitle}>Nuevo Estado</Text>
            <View style={styles.estadoOptions}>
              {Object.entries(estadoConfig).map(([estadoKey, config]) => {
                const value = estadoKey as Reporte["estado"];
                const selected = nuevoEstado === value;

                return (
                  <TouchableOpacity
                    key={value}
                    activeOpacity={0.8}
                    onPress={() => setNuevoEstado(value)}
                    style={[
                      styles.estadoOption,
                      selected && styles.estadoOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.estadoOptionText,
                        selected && styles.estadoOptionTextSelected,
                      ]}
                    >
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {nuevoEstado === "asignado" && (
              <View style={styles.extraSection}>
                <Text style={styles.sectionTitle}>Seleccionar Cuadrilla</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filtroScrollContent}
                >
                  {cuadrillasDisponibles.map((cuadrilla: Cuadrilla) => {
                    const selected = cuadrillaSeleccionada === cuadrilla.id;

                    return (
                      <TouchableOpacity
                        key={cuadrilla.id}
                        activeOpacity={0.8}
                        onPress={() => setCuadrillaSeleccionada(cuadrilla.id)}
                        style={[
                          styles.estadoOption,
                          selected && styles.estadoOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.estadoOptionText,
                            selected && styles.estadoOptionTextSelected,
                          ]}
                        >
                          {cuadrilla.nombre}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {nuevoEstado === "resuelto" && (
              <View style={styles.extraSection}>
                <Text style={styles.sectionTitle}>Foto de resolución</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={adjuntarFotoResolucion}
                  style={styles.fotoButton}
                >
                  <Text style={styles.fotoButtonText}>
                    {fotoResolucion ? "Cambiar foto" : "Adjuntar foto del arreglo"}
                  </Text>
                </TouchableOpacity>

                {fotoResolucion && (
                  <Image
                    source={{ uri: fotoResolucion }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                )}
              </View>
            )}

            <Text style={styles.sectionTitle}>Comentario del Operador</Text>
            <TextInput
              multiline
              numberOfLines={5}
              value={comentario}
              onChangeText={setComentario}
              placeholder="Escribe el motivo del cambio de estado..."
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={cerrarModal}
                style={[styles.secondaryButton]}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={guardarCambioEstado}
                disabled={!comentario.trim()}
                style={[
                  styles.primaryButton,
                  !comentario.trim() && styles.primaryButtonDisabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
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
  filtrosContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 12,
  },
  filtroScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingRight: 20,
  },
  filtroButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#EEF2F6",
    justifyContent: "center",
    alignItems: "center",
  },
  filtroButtonActivo: {
    backgroundColor: "#1F6FEB",
  },
  filtroTexto: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  filtroTextoActivo: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
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
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  descripcionTexto: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
    marginBottom: 12,
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
    marginTop: 8,
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
    flexShrink: 1,
    textAlign: "right",
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
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  modalCodigo: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 20,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  estadoOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 18,
    gap: 8,
  },
  estadoOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#EEF2F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  estadoOptionSelected: {
    backgroundColor: "#E8F0FF",
    borderColor: "#2563EB",
  },
  estadoOptionText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
  estadoOptionTextSelected: {
    color: "#1D4ED8",
  },
  extraSection: {
    marginBottom: 18,
  },
  textInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    marginBottom: 18,
  },
  fotoButton: {
    backgroundColor: "#E8F0FF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  fotoButtonText: {
    color: "#1D4ED8",
    fontWeight: "700",
    fontSize: 13,
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  secondaryButtonText: {
    color: "#111827",
    fontWeight: "600",
  },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1F6FEB",
  },
  primaryButtonDisabled: {
    backgroundColor: "#93C5FD",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
