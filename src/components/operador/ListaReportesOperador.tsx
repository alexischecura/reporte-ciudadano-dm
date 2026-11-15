import { useTheme } from "@/hooks/use-theme";
import type { ThemeColors } from "@/constants/theme";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { TextoCorregido } from "@/components/texto-corregido";
import { 
  listarBandejaOperador, 
  cambiarEstadoReporte, 
  asignarCuadrillaReporte, 
  listarCuadrillas,
  listarTiposDeReporte,
  listarZonas,
  listarReportes,
  marcarReporteComoDuplicado
} from "../../servicios/reportes";
import type { Reporte } from "../../tipos";
import type { Cuadrilla } from "../../tipos/cuadrilla";
import { vibracionExito } from "../../utils/haptica";

type FiltroEstado = "todos" | "pendiente" | "en_progreso" | "resuelto" | "en_revision";

const estadoConfig: Record<
  Reporte["estado"],
  { label: string; color: string; backgroundColor: string }
> = {
  recibido: {
    label: "Pendiente",
    color: "#A35C00",
    backgroundColor: "#FFF0D9",
  },
  en_revision: {
    label: "En revisión",
    color: "#00579A",
    backgroundColor: "#DFF3FF",
  },
  asignado: {
    label: "En Progreso",
    color: "#0B6E4F",
    backgroundColor: "#D9F7ED",
  },
  resuelto: { label: "Resuelto", color: "#155724", backgroundColor: "#D4EDDA" },
  rechazado: {
    label: "Rechazado",
    color: "#6C757D",
    backgroundColor: "#E9ECEF",
  },
};

const filtroLabels: { value: FiltroEstado; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_revision", label: "En revisión" },
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

export default function ListaReportesOperador(): React.ReactElement {
  const colors = useTheme();
  const styles = createStyles(colors);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [zonas, setZonas] = useState<any[]>([]);
  
  const [filtroActivo, setFiltroActivo] = useState<FiltroEstado>("todos");
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string>("");
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>("");

  const [reporteSeleccionado, setReporteSeleccionado] = useState<Reporte | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState<Reporte["estado"]>("en_revision");
  const [comentario, setComentario] = useState("");
  const [cuadrillaSeleccionada, setCuadrillaSeleccionada] = useState<string | null>(null);
  const [fotoResolucion, setFotoResolucion] = useState<string | null>(null);
  
  // Estados para la funcionalidad de duplicados
  const [esDuplicado, setEsDuplicado] = useState(false);
  const [reporteOriginalId, setReporteOriginalId] = useState("");

  const [loading, setLoading] = useState(false);

  // Funciones dinámicas que buscan en el estado local
  const getTipoReporte = (tipoId: string) => tipos.find((t) => t.id === tipoId) ?? null;
  const getZona = (zonaId: string) => zonas.find((z) => z.id === zonaId) ?? null;

  // Cargar reportes de la bandeja filtrada (envuelta en useCallback para satisfacer a React)
  const cargarBandeja = useCallback(async () => {
    setLoading(true);
    try {
      let listaReportes: Reporte[] = [];

      if (filtroActivo === "resuelto") {
        const resultado = await listarReportes({
          estado: "resuelto",
          zonaId: zonaSeleccionada || undefined,
          tipoId: tipoSeleccionado || undefined,
        });
        listaReportes = resultado;
      } else {
        let estadoParam: string | undefined = undefined;
        if (filtroActivo === "pendiente") estadoParam = "recibido";
        else if (filtroActivo === "en_progreso") estadoParam = "asignado";
        else if (filtroActivo === "en_revision") estadoParam = "en_revision";

        const resultado = await listarBandejaOperador({
          estado: estadoParam,
          zonaId: zonaSeleccionada || undefined,
          tipoId: tipoSeleccionado || undefined,
        });
        listaReportes = (resultado as any).datos || resultado;
      }

      setReportes(listaReportes);
    } catch (error) {
      console.error("Error al obtener los reportes:", error);
    } finally {
      setLoading(false);
    }
  }, [filtroActivo, zonaSeleccionada, tipoSeleccionado]);

  // Cargar bandeja cuando cambian los filtros
  useEffect(() => {
    let activo = true;

    async function ejecutarCarga() {
      if (activo) {
        await cargarBandeja();
      }
    }

    void ejecutarCarga();

    return () => {
      activo = false;
    };
  }, [cargarBandeja]);


  useEffect(() => {
    let activo = true;

    const cargarDatosIniciales = async () => {
      try {
        const [resCuadrillas, resTipos, resZonas] = await Promise.all([
          listarCuadrillas(),
          listarTiposDeReporte(),
          listarZonas()
        ]);
        if (!activo) return;
        setCuadrillas((resCuadrillas as any).datos || resCuadrillas);
        setTipos(resTipos);
        setZonas(resZonas);
      } catch (error) {
        if (activo) {
          console.error("Error al cargar datos iniciales:", error);
        }
      }
    };

    void cargarDatosIniciales();

    return () => {
      activo = false;
    };
  }, []);

  const cuadrillasDisponibles = cuadrillas.filter(
    (cuadrilla) =>
      reporteSeleccionado &&
      cuadrilla.zonaId === reporteSeleccionado.zonaId &&
      cuadrilla.activa,
  );

  const abrirModal = (reporte: Reporte) => {
    setReporteSeleccionado(reporte);
    setNuevoEstado(reporte.estado);
    setComentario("");
    setCuadrillaSeleccionada(null);
    setFotoResolucion(null);
    setEsDuplicado(false);
    setReporteOriginalId("");
  };

  const cerrarModal = () => {
    setReporteSeleccionado(null);
    setNuevoEstado("en_revision");
    setComentario("");
    setCuadrillaSeleccionada(null);
    setFotoResolucion(null);
    setEsDuplicado(false);
    setReporteOriginalId("");
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

  const guardarCambioEstado = async () => {
    if (!reporteSeleccionado) {
      return;
    }

    if (!comentario.trim()) {
      Alert.alert(
        "Comentario obligatorio",
        "Debes completar el comentario del operador.",
      );
      return;
    }

    if (esDuplicado && !reporteOriginalId) {
      Alert.alert(
        "Reporte original requerido",
        "Debes seleccionar cuál es el reporte original de la lista.",
      );
      return;
    }

    if (!esDuplicado && nuevoEstado === "asignado" && !cuadrillaSeleccionada) {
      Alert.alert(
        "Cuadrilla requerida",
        "Debes seleccionar una cuadrilla antes de guardar.",
      );
      return;
    }

    if (!esDuplicado && nuevoEstado === "resuelto" && !fotoResolucion) {
      Alert.alert(
        "Foto requerida",
        "Debes adjuntar la foto del arreglo antes de guardar.",
      );
      return;
    }

    try {
      setLoading(true);

      if (esDuplicado) {
        await marcarReporteComoDuplicado(
          reporteSeleccionado.id,
          reporteOriginalId,
          comentario.trim()
        );
      } else if (nuevoEstado === "asignado" && cuadrillaSeleccionada) {
        await asignarCuadrillaReporte(
          reporteSeleccionado.id, 
          cuadrillaSeleccionada,
          comentario.trim()
        );
      } else {
        await cambiarEstadoReporte(
          reporteSeleccionado.id, 
          nuevoEstado, 
          comentario.trim(),
          fotoResolucion 
        );
      }

      vibracionExito();
      cerrarModal();
      await cargarBandeja();
    } catch (error: any) {
      console.error("Error al guardar el cambio:", error);
      const mensajeApi = error?.message || "No se pudo actualizar el estado del reporte en el servidor.";
      
      Alert.alert(
        "Transición no permitida",
        mensajeApi
      );
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Reporte }) => {
    const tipo = getTipoReporte(item.tipoId);
    const zona = getZona(item.zonaId);
    const estado = estadoConfig[item.estado] ?? estadoConfig.recibido;
    const fotoUrl = item.fotos?.[0]?.url;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => abrirModal(item)}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleWrap}>
            <TextoCorregido style={styles.tipoTexto}>
              {tipo?.nombre ?? "Reporte"}
            </TextoCorregido>
            <TextoCorregido style={styles.codigoTexto}>
              {item.codigo}
            </TextoCorregido>
          </View>

          <View style={[styles.badge, { backgroundColor: estado.backgroundColor }]}>
            <TextoCorregido style={[styles.badgeText, { color: estado.color }]}>
              {estado.label}
            </TextoCorregido>
          </View>
        </View>

        <TextoCorregido style={styles.descripcionTexto} numberOfLines={2}>
          {item.descripcion ?? "Sin descripción adicional."}
        </TextoCorregido>

        {fotoUrl ? (
          <Image source={{ uri: fotoUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : null}

        <View style={styles.metaRow}>
          <TextoCorregido style={styles.metaLabel}>Fecha</TextoCorregido>
          <TextoCorregido style={styles.metaValue}>
            {formatFecha(item.creadoEn)}
          </TextoCorregido>
        </View>

        <View style={styles.metaRow}>
          <TextoCorregido style={styles.metaLabel}>Zona</TextoCorregido>
          <TextoCorregido style={styles.metaValue}>
            {zona?.nombre ?? item.zonaId}
          </TextoCorregido>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
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
                style={[styles.filtroButton, activo && styles.filtroButtonActivo]}
              >
                <TextoCorregido style={[styles.filtroTexto, activo && styles.filtroTextoActivo]}>
                  {filtro.label}
                </TextoCorregido>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.filtrosSecundariosContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtroScrollContent}>
          <TouchableOpacity
            onPress={() => setZonaSeleccionada("")}
            style={[styles.chipSecundario, zonaSeleccionada === "" && styles.chipSecundarioActivo]}
          >
            <TextoCorregido style={[styles.chipTexto, zonaSeleccionada === "" && styles.chipTextoActivo]}>
              Todas las zonas
            </TextoCorregido>
          </TouchableOpacity>
          {zonas.map((z) => (
            <TouchableOpacity
              key={z.id}
              onPress={() => setZonaSeleccionada(z.id)}
              style={[styles.chipSecundario, zonaSeleccionada === z.id && styles.chipSecundarioActivo]}
            >
              <TextoCorregido style={[styles.chipTexto, zonaSeleccionada === z.id && styles.chipTextoActivo]}>
                {z.nombre}
              </TextoCorregido>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filtroScrollContent, { marginTop: 6 }]}>
          <TouchableOpacity
            onPress={() => setTipoSeleccionado("")}
            style={[styles.chipSecundario, tipoSeleccionado === "" && styles.chipSecundarioActivo]}
          >
            <TextoCorregido style={[styles.chipTexto, tipoSeleccionado === "" && styles.chipTextoActivo]}>
              Todos los tipos
            </TextoCorregido>
          </TouchableOpacity>
          {tipos.map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTipoSeleccionado(t.id)}
              style={[styles.chipSecundario, tipoSeleccionado === t.id && styles.chipSecundarioActivo]}
            >
              <TextoCorregido style={[styles.chipTexto, tipoSeleccionado === t.id && styles.chipTextoActivo]}>
                {t.nombre}
              </TextoCorregido>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={reportes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={10}
        removeClippedSubviews={true}
      />

      <Modal
        visible={reporteSeleccionado !== null}
        transparent
        animationType="slide"
        onRequestClose={cerrarModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TextoCorregido style={styles.modalTitle}>Gestionar Reporte</TextoCorregido>

            {reporteSeleccionado && (
              <TextoCorregido style={styles.modalCodigo}>
                {reporteSeleccionado.codigo}
              </TextoCorregido>
            )}

            {/* BOTÓN / TOGGLE PARA MARCAR COMO DUPLICADO */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setEsDuplicado(!esDuplicado)}
              style={[styles.duplicadoToggle, esDuplicado && styles.duplicadoToggleActive]}
            >
              <TextoCorregido style={[styles.duplicadoToggleText, esDuplicado && styles.duplicadoToggleTextActive]}>
                {esDuplicado ? "✔ Marcado como Duplicado" : "Marcar como Duplicado de otro"}
              </TextoCorregido>
            </TouchableOpacity>

            {esDuplicado ? (
              <View style={styles.extraSection}>
                <TextoCorregido style={styles.sectionTitle}>Seleccioná el Reporte Original:</TextoCorregido>
                <ScrollView style={styles.listaOriginalesScroll} nestedScrollEnabled>
                  {reportes
                    .filter((r) => r.id !== reporteSeleccionado?.id)
                    .map((item) => {
                      const selected = reporteOriginalId === item.id;
                      const tipo = getTipoReporte(item.tipoId);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.8}
                          onPress={() => setReporteOriginalId(item.id)}
                          style={[styles.originalItem, selected && styles.originalItemSelected]}
                        >
                          <TextoCorregido style={[styles.originalItemText, selected && styles.originalItemTextSelected]}>
                            {item.codigo} - {tipo?.nombre ?? "Reporte"} ({item.estado})
                          </TextoCorregido>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </View>
            ) : (
              <>
                <TextoCorregido style={styles.sectionTitle}>Nuevo Estado</TextoCorregido>
                <View style={styles.estadoOptions}>
                  {Object.entries(estadoConfig).map(([estadoKey, config]) => {
                    const value = estadoKey as Reporte["estado"];
                    const selected = nuevoEstado === value;

                    return (
                      <TouchableOpacity
                        key={value}
                        activeOpacity={0.8}
                        onPress={() => setNuevoEstado(value)}
                        style={[styles.estadoOption, selected && styles.estadoOptionSelected]}
                      >
                        <TextoCorregido
                          style={[styles.estadoOptionText, selected && styles.estadoOptionTextSelected]}
                        >
                          {config.label}
                        </TextoCorregido>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {nuevoEstado === "asignado" && (
                  <View style={styles.extraSection}>
                    <TextoCorregido style={styles.sectionTitle}>Seleccionar Cuadrilla</TextoCorregido>
                    {cuadrillasDisponibles.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtroScrollContent}>
                        {cuadrillasDisponibles.map((cuadrilla: Cuadrilla) => {
                          const selected = cuadrillaSeleccionada === cuadrilla.id;
                          return (
                            <TouchableOpacity
                              key={cuadrilla.id}
                              activeOpacity={0.8}
                              onPress={() => setCuadrillaSeleccionada(cuadrilla.id)}
                              style={[styles.estadoOption, selected && styles.estadoOptionSelected]}
                            >
                              <TextoCorregido
                                style={[styles.estadoOptionText, selected && styles.estadoOptionTextSelected]}
                              >
                                {cuadrilla.nombre}
                              </TextoCorregido>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    ) : (
                      <TextoCorregido style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                        No hay cuadrillas activas para la zona de este reporte.
                      </TextoCorregido>
                    )}
                  </View>
                )}

                {nuevoEstado === "resuelto" && (
                  <View style={styles.extraSection}>
                    <TextoCorregido style={styles.sectionTitle}>Foto de resolución</TextoCorregido>
                    <TouchableOpacity activeOpacity={0.8} onPress={adjuntarFotoResolucion} style={styles.fotoButton}>
                      <TextoCorregido style={styles.fotoButtonText}>
                        {fotoResolucion ? "Cambiar foto" : "Adjuntar foto del arreglo"}
                      </TextoCorregido>
                    </TouchableOpacity>

                    {fotoResolucion && (
                      <Image source={{ uri: fotoResolucion }} style={styles.previewImage} resizeMode="cover" />
                    )}
                  </View>
                )}
              </>
            )}

            <TextoCorregido style={styles.sectionTitle}>Comentario del Operador</TextoCorregido>
            <TextInput
              multiline
              numberOfLines={3}
              value={comentario}
              onChangeText={setComentario}
              placeholder="Escribe el motivo..."
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity activeOpacity={0.8} onPress={cerrarModal} style={styles.secondaryButton}>
                <TextoCorregido style={styles.secondaryButtonText}>Cancelar</TextoCorregido>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={guardarCambioEstado}
                disabled={!comentario.trim() || loading}
                style={[styles.primaryButton, (!comentario.trim() || loading) && styles.primaryButtonDisabled]}
              >
                <TextoCorregido style={styles.primaryButtonText}>Guardar</TextoCorregido>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filtrosContainer: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8 },
  filtrosSecundariosContainer: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 6 },
  filtroScrollContent: { paddingHorizontal: 16, gap: 8 },
  filtroButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.backgroundElement },
  filtroTexto: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  filtroButtonActivo: { backgroundColor: colors.primaryBackground },
  filtroTextoActivo: { color: "#FFFFFF" },
  chipSecundario: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.border },
  chipSecundarioActivo: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  chipTexto: { fontSize: 11, fontWeight: "500", color: colors.textSecondary },
  chipTextoActivo: { color: colors.primary, fontWeight: "700" },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12 },
  titleWrap: { flex: 1 },
  tipoTexto: { fontSize: 18, fontWeight: "700", color: colors.text },
  codigoTexto: { marginTop: 2, fontSize: 12, color: colors.textSecondary, fontWeight: "500" },
  descripcionTexto: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 11, fontWeight: "700", textAlign: "center" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  metaLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  metaValue: { fontSize: 12, fontWeight: "600", color: colors.text, textAlign: "right" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(17, 24, 39, 0.45)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 6 },
  modalCodigo: { fontSize: 14, color: colors.textSecondary, marginBottom: 14, fontWeight: "600" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8 },
  duplicadoToggle: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.border, marginBottom: 14, alignItems: "center" },
  duplicadoToggleActive: { backgroundColor: "#FEF3C7", borderColor: "#D97706" },
  duplicadoToggleText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  duplicadoToggleTextActive: { color: "#92400E" },
  listaOriginalesScroll: { maxHeight: 160, borderWidth: 1, borderColor: colors.border, borderRadius: 10, marginBottom: 14, backgroundColor: colors.backgroundElement },
  originalItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  originalItemSelected: { backgroundColor: colors.primaryMuted },
  originalItemText: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  originalItemTextSelected: { color: colors.primary, fontWeight: "700" },
  estadoOptions: { flexDirection: "row", flexWrap: "wrap", marginBottom: 14, gap: 8 },
  estadoOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.border },
  estadoOptionSelected: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  estadoOptionText: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  estadoOptionTextSelected: { color: colors.primary },
  extraSection: { marginBottom: 14 },
  textInput: { color: colors.text, minHeight: 70, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14, backgroundColor: colors.backgroundElement, marginBottom: 14 },
  fotoButton: { backgroundColor: colors.primaryMuted, borderRadius: 10, paddingVertical: 10, alignItems: "center", marginBottom: 10 },
  fotoButtonText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  previewImage: { width: "100%", height: 120, borderRadius: 12, marginBottom: 10 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  secondaryButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.backgroundSelected },
  secondaryButtonText: { color: colors.text, fontWeight: "600" },
  primaryButton: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primaryBackground },
  primaryButtonDisabled: { backgroundColor: "#93C5FD" },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700" },
  cardImage: { width: "100%", height: 140, borderRadius: 10, marginBottom: 12 },
});