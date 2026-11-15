import React, { type ReactNode } from "react";
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/hooks/use-theme";
import type { ThemeColors } from "@/constants/theme";
import type { CambioDeEstado, Reporte, TipoDeReporte } from "@/tipos";
import { vibracionSuave } from "@/utils/haptica";

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

type Props = {
  visible: boolean;
  reporte: Reporte;
  tipo: TipoDeReporte | null;
  historialReporte: CambioDeEstado[];
  cargandoDetalle?: boolean;
  qrValue?: string;
  onCerrar: () => void;
  children?: ReactNode;
};

/** Detalle compartido por el mapa y los reportes propios. */
export function DetalleReporteModal({
  visible,
  reporte,
  tipo,
  historialReporte,
  cargandoDetalle = false,
  qrValue,
  onCerrar,
  children,
}: Props) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const estado = estadoConfig[reporte.estado];
  const fotos = (reporte.fotos ?? []).filter((foto) => Boolean(foto.url?.trim()));
  const fotosValidas = fotos.filter((foto) => foto.momento !== "arreglo");
  const fotosArreglo = reporte.estado === "resuelto"
    ? fotos.filter((foto) => foto.momento === "arreglo")
    : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
          >
            <Text style={styles.modalTitle}>{reporte.codigo}</Text>

            {cargandoDetalle ? (
              <View style={styles.loadingDetalle}>
                <ActivityIndicator size="small" color={colors.primary} />
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
                      {formatFecha(reporte.creadoEn)}
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
                  {reporte.descripcion || "Sin descripción adicional."}
                </Text>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>Dirección</Text>
                    <Text style={styles.detailValue}>
                      {reporte.direccion}
                    </Text>
                  </View>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>Adhesiones</Text>
                    <Text style={styles.detailValue}>
                      {reporte.adhesiones}
                    </Text>
                  </View>
                </View>

                <View style={styles.qrContainer}>
                  <QRCode
                    value={qrValue ?? reporte.codigo}
                    size={180}
                    backgroundColor="white"
                    color="#111827"
                  />
                </View>

                <Text style={styles.helperText}>
                  Muestre este código en ventanilla para consultar su trámite.
                </Text>

                <Text style={styles.sectionLabel}>Fotos del problema</Text>
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

                {fotosArreglo.length > 0 && (
                  <View style={styles.fotoArregloContainer}>
                    <Text style={styles.sectionLabel}>Foto de la solución</Text>
                    {fotosArreglo.map((foto) => (
                      <Image
                        key={foto.id}
                        source={{ uri: foto.url }}
                        style={styles.fotoArreglo}
                        resizeMode="cover"
                        accessibilityLabel="Foto de la solución del reporte"
                        accessibilityIgnoresInvertColors
                      />
                    ))}
                  </View>
                )}

                {children}

                <View style={styles.timelineContainer}>
                  <Text style={styles.timelineTitle}>Seguimiento</Text>

                  {historialReporte.map(
                    (cambio, index, items) => (
                      <React.Fragment key={cambio.id}>
                        <View style={styles.timelineRow}>
                          <View
                            style={[
                              styles.timelineDot,
                              cambio.estado === reporte.estado &&
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

                  {historialReporte.length === 0 && (
                    <View style={styles.timelineRow}>
                      <View
                        style={[styles.timelineDot, styles.timelineDotActive]}
                      />
                      <View style={styles.timelineTextWrap}>
                        <Text style={styles.timelineText}>
                          {estadoConfig[reporte.estado]?.label ??
                            reporte.estado}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={async () => {
                    await vibracionSuave();
                    onCerrar();
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
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  descriptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 18,
  },
  detailBox: {
    flex: 1,
    backgroundColor: colors.backgroundElement,
    borderRadius: 12,
    padding: 12,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "700",
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
  },
  detailsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 18,
  },
  foto: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    backgroundColor: colors.backgroundSelected,
  },
  fotoFrame: {
    width: "32%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.backgroundSelected,
  },
  fotosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    columnGap: 8,
    rowGap: 8,
  },
  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  heroInfo: {
    flex: 1,
  },
  heroMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    gap: 12,
  },
  heroTipo: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  loadingDetalle: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.surface,
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
    color: colors.text,
    marginBottom: 18,
  },
  qrContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  timelineComment: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  timelineContainer: {
    width: "100%",
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginTop: 6,
  },
  timelineDotActive: {
    backgroundColor: colors.primaryBackground,
  },
  timelineLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.border,
    marginLeft: 4,
    marginVertical: 4,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  timelineText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  timelineTextWrap: {
    flex: 1,
    gap: 4,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  fotoArregloContainer: { width: "100%", marginBottom: 16, gap: 8 },
  fotoArreglo: { width: "100%", height: 200, borderRadius: 12 },
});
