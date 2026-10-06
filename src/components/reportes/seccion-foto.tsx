import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { eliminarArchivo, guardarFoto } from "../../servicios/almacenamiento";
import { CamaraReporte } from "./camara-reporte";

interface Props {
  fotos: string[];
  directorioBorrador: string;
  onCambiar: (fotos: string[]) => void;
}

export const MAX_FOTOS = 2;

export function SeccionFoto({ fotos, directorioBorrador, onCambiar }: Props) {
  const colors = useTheme();
  const [camaraVisible, setCamaraVisible] = useState(false);
  const llena = fotos.length >= MAX_FOTOS;

  const agregarUriTemporal = async (uriTemporal: string) => {
    try {
      const persistente = await guardarFoto(uriTemporal, directorioBorrador);
      onCambiar([...fotos, persistente].slice(0, MAX_FOTOS));
    } catch {
      Alert.alert("No se pudo guardar", "La foto no se pudo copiar al almacenamiento local.");
    }
  };

  const abrirGaleria = async () => {
    if (llena) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      await agregarUriTemporal(res.assets[0].uri);
    }
  };

  const quitar = (uri: string) => {
    eliminarArchivo(uri);
    onCambiar(fotos.filter((f) => f !== uri));
  };

  return (
    <View style={styles.cont}>
      <ThemedText style={styles.titulo}>Foto (obligatoria)</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.sub}>
        {fotos.length === 0
          ? "Sin foto no hay reporte."
          : fotos.length === 1
            ? "1 de 2 — podés agregar una segunda si no se entiende."
            : "2 de 2 — máximo alcanzado."}
      </ThemedText>

      <View style={styles.botones}>
        <Pressable
          style={[styles.boton, { backgroundColor: colors.primary }, llena && styles.botonOff]}
          disabled={llena}
          onPress={() => setCamaraVisible(true)}>
          <ThemedText style={[styles.botonTxt, { color: "#fff" }]}>
            Tomar foto
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.boton,
            styles.botonSec,
            { borderColor: colors.primary },
            llena && styles.botonOff,
          ]}
          disabled={llena}
          onPress={() => {
            void abrirGaleria();
          }}>
          <ThemedText style={styles.botonSecTxt} themeColor="primary">
            Galería
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.previews}>
        {fotos.map((uri) => (
          <View key={uri} style={styles.previewWrap}>
            <Image
              source={{ uri }}
              style={[styles.preview, { backgroundColor: colors.backgroundSelected }]}
            />
            <Pressable style={styles.quitar} onPress={() => quitar(uri)}>
              <ThemedText style={[styles.quitarTxt, { color: "#fff" }]}>
                ✕
              </ThemedText>
            </Pressable>
          </View>
        ))}
      </View>

      <CamaraReporte
        visible={camaraVisible}
        onCerrar={() => setCamaraVisible(false)}
        onFoto={(uri) => {
          void agregarUriTemporal(uri);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cont: { gap: 8 },
  titulo: { fontSize: 18, fontWeight: "700" },
  sub: { fontSize: 14 },
  botones: { flexDirection: "row", gap: 12 },
  boton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  botonOff: { opacity: 0.4 },
  botonTxt: { fontSize: 17, fontWeight: "700" },
  botonSec: { backgroundColor: "transparent", borderWidth: 1.5 },
  botonSecTxt: { fontSize: 17, fontWeight: "700" },
  previews: { flexDirection: "row", gap: 12, marginTop: 4 },
  previewWrap: { position: "relative", width: 140, height: 140 },
  preview: { width: 140, height: 140, borderRadius: 12 },
  quitar: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  quitarTxt: { fontWeight: "700" },
});