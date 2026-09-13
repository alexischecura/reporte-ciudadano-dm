import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";

import { MOCK_REPORTES } from "../../mocks/reportes.mock";
import { MOCK_TIPOS_DE_REPORTE } from "../../mocks/tipos-de-reporte.mock";
import type { Reporte } from "../../tipos";
import { vibracionSuave } from "../../utils/haptica";

const estadoConfig: Record<
  Reporte["estado"],
  { label: string; color: string; backgroundColor: string }
> = {
  recibido: { label: "Recibido", color: "#A35C00", backgroundColor: "#FFF0D9" },
  en_revision: { label: "En revisión", color: "#00579A", backgroundColor: "#DFF3FF" },
  asignado: { label: "Asignado", color: "#0B6E4F", backgroundColor: "#D9F7ED" },
  resuelto: { label: "Resuelto", color: "#155724", backgroundColor: "#D4EDDA" },
  rechazado: { label: "Rechazado", color: "#6C757D", backgroundColor: "#E9ECEF" },
};

const getTipoReporte = (tipoId: string) =>
  MOCK_TIPOS_DE_REPORTE.find((tipo) => tipo.id === tipoId) ?? null;

const formatFecha = (fechaIso: string): string => {
  const fecha = new Date(fechaIso);

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
};

export default function SeguimientoVecino(): JSX.Element {
  const [reporteSeleccionado, setReporteSeleccionado] = useState<Reporte | null>(
    null,
  );

  const misReportes = useMemo(() => MOCK_REPORTES.slice(0, 3), []);

  const renderItem = ({ item }: { item: Reporte }) => {
    const tipo = getTipoReporte(item.tipoId);
    const estado = estadoConfig[item.estado];

    return (
      <View style={styles.card}>
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

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Fecha</Text>
          <Text style={styles.metaValue}>{formatFecha(item.creadoEn)}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={async () => {
            await vibracionSuave();
            setReporteSeleccionado(item);
          }}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Ver Seguimiento y QR</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Reclamos</Text>
      </View>

      <FlatList
        data={misReportes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={reporteSeleccionado !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setReporteSeleccionado(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{reporteSeleccionado?.codigo}</Text>

            <View style={styles.qrContainer}>
              {reporteSeleccionado && (
                <QRCode
                  value={reporteSeleccionado.id}
                  size={200}
                  backgroundColor="white"
                  color="#111827"
                />
              )}
            </View>

            <Text style={styles.helperText}>
              Muestre este código en ventanilla para consultar su trámite.
            </Text>

            <View style={styles.timelineContainer}>
              <Text style={styles.timelineTitle}>Seguimiento</Text>

              <View style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <Text style={styles.timelineText}>Recibido</Text>
              </View>

              <View style={styles.timelineLine} />

              <View style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <Text style={styles.timelineText}>En Revisión</Text>
              </View>

              <View style={styles.timelineLine} />

              <View style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <Text style={styles.timelineText}>Resuelto</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={async () => {
                await vibracionSuave();
                setReporteSeleccionado(null);
              }}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Cerrar</Text>
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
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
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
    alignItems: "center",
    gap: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#1F6FEB",
  },
  timelineText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
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
