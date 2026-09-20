import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { solicitarPermiso } from "../../utils/permisos";

interface Props {
  visible: boolean;
  onCerrar: () => void;
  /** URI temporal (cache) recién capturada. El padre la persiste con guardarFoto(). */
  onFoto: (uriTemporal: string) => void;
}

/**
 * Cámara del reporte (Juanchi) — expo-camera CameraView, lente trasera.
 * Manejo amigable de permisos: Reintentar vs Abrir ajustes.
 */
export function CamaraReporte({ visible, onCerrar, onFoto }: Props) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [lista, setLista] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const ref = useRef<CameraView>(null);

  const asegurarPermiso = async (): Promise<boolean> => {
    if (permiso?.granted) return true;
    return solicitarPermiso(
      async () => {
        const r = await pedirPermiso();
        return { granted: r.granted, canAskAgain: r.canAskAgain, status: r.status };
      },
      {
        tituloDenegado: "Necesitamos la cámara",
        mensajeDenegado:
          "Sin foto no podemos tomar el reporte (es obligatoria por el PRD). ¿Intentamos de nuevo?",
        tituloBloqueado: "Cámara bloqueada",
        mensajeBloqueado:
          "Bloqueaste la cámara desde el sistema. Abrí Ajustes y activá el permiso para poder reportar.",
      }
    );
  };

  const tomarFoto = async () => {
    if (!ref.current || !lista || capturando) return;
    const ok = await asegurarPermiso();
    if (!ok) return;
    try {
      setCapturando(true);
      const foto = await ref.current.takePictureAsync({ quality: 0.7 });
      if (foto?.uri) {
        onFoto(foto.uri);
        onCerrar();
      }
    } finally {
      setCapturando(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar}>
      <View style={styles.cont}>
        {permiso?.granted ? (
          <CameraView
            ref={ref}
            style={styles.camara}
            facing="back"
            onCameraReady={() => setLista(true)}
          />
        ) : (
          <View style={styles.sinPermiso}>
            <Text style={styles.titulo}>Necesitamos la cámara</Text>
            <Text style={styles.sub}>
              La foto del problema es obligatoria. Aceptá el permiso para continuar.
            </Text>
            <Pressable
              style={styles.boton}
              onPress={() => {
                void asegurarPermiso();
              }}>
              <Text style={styles.botonTxt}>Dar permiso</Text>
            </Pressable>
            <Pressable style={[styles.boton, styles.botonGhost]} onPress={onCerrar}>
              <Text style={styles.botonGhostTxt}>Cancelar</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.barra}>
          <Pressable style={[styles.boton, styles.botonGhost]} onPress={onCerrar}>
            <Text style={styles.botonGhostTxt}>Cerrar</Text>
          </Pressable>
          {permiso?.granted && (
            <Pressable
              style={[styles.boton, capturando && styles.botonOff]}
              onPress={() => {
                void tomarFoto();
              }}
              disabled={capturando || !lista}>
              {capturando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.botonTxt}>Sacar foto</Text>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cont: { flex: 1, backgroundColor: "#000" },
  camara: { flex: 1 },
  sinPermiso: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  titulo: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center" },
  sub: { color: "#ccc", fontSize: 15, textAlign: "center" },
  barra: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  boton: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 22,
    minWidth: 140,
    alignItems: "center",
  },
  botonOff: { opacity: 0.6 },
  botonTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
  botonGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#666" },
  botonGhostTxt: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
