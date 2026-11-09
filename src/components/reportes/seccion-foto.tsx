import * as ImagePicker from "expo-image-picker";

import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { eliminarArchivo, guardarFoto } from "../../servicios/almacenamiento";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { useState } from "react";
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
  const [procesando, setProcesando] = useState(false);

  const llena = fotos.length >= MAX_FOTOS;
  const deshabilitado = llena || procesando;

  const agregarUriTemporal = async (uriTemporal: string) => {
    if (deshabilitado) return;

    setProcesando(true);

    try {
      const persistente = await guardarFoto(uriTemporal, directorioBorrador);

      onCambiar([...fotos, persistente].slice(0, MAX_FOTOS));
    } catch {
      Alert.alert(
        "No se pudo guardar",
        "La foto no se pudo copiar al almacenamiento local.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const abrirGaleria = async () => {
    if (deshabilitado) return;

    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsMultipleSelection: false,
      });

      if (!resultado.canceled && resultado.assets[0]?.uri) {
        await agregarUriTemporal(resultado.assets[0].uri);
      }
    } catch {
      Alert.alert("No se pudo abrir la galería", "Intentá nuevamente.");
    }
  };

  const quitar = async (uri: string) => {
    if (procesando) return;

    try {
      await eliminarArchivo(uri);
      onCambiar(fotos.filter((foto) => foto !== uri));
    } catch {
      Alert.alert(
        "No se pudo eliminar",
        "Intentá quitar la fotografía nuevamente.",
      );
    }
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
          accessibilityRole="button"
          accessibilityLabel="Tomar foto"
          disabled={deshabilitado}
          onPress={() => setCamaraVisible(true)}
          style={({ pressed }) => [
            styles.boton,
            { backgroundColor: colors.primary },
            deshabilitado && styles.botonOff,
            pressed && !deshabilitado && styles.presionado,
          ]}
        >
          <Text style={styles.botonTxt}>Tomar foto</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Elegir foto de la galería"
          disabled={deshabilitado}
          onPress={() => void abrirGaleria()}
          style={({ pressed }) => [
            styles.boton,
            styles.botonSec,
            { borderColor: colors.primary },
            deshabilitado && styles.botonOff,
            pressed && !deshabilitado && styles.presionado,
          ]}
        >
          <Text style={[styles.botonSecTxt, { color: colors.primary }]}>
            Galería
          </Text>
        </Pressable>
      </View>

      <View style={styles.previews}>
        {fotos.map((uri) => (
          <View key={uri} style={styles.previewWrap}>
            <Image
              source={{ uri }}
              style={[
                styles.preview,
                {
                  backgroundColor: colors.backgroundSelected,
                },
              ]}
              resizeMode="cover"
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Eliminar fotografía"
              style={styles.quitar}
              onPress={() => void quitar(uri)}
            >
              <Text style={styles.quitarTxt}>✕</Text>
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
  cont: {
    width: "100%",
    gap: 10,
  },

  titulo: {
    fontSize: 18,
    fontWeight: "700",
  },

  sub: {
    fontSize: 14,
    lineHeight: 21,
    flexShrink: 1,
  },

  botones: {
    flexDirection: "row",
    alignItems: "stretch",
    width: "100%",
    gap: 12,
  },

  boton: {
    flex: 1,
    minWidth: 0,
    minHeight: 60,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  botonSec: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
  },

  botonTxt: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
    flexShrink: 1,
    includeFontPadding: true,
  },

  botonSecTxt: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
    flexShrink: 1,
    includeFontPadding: true,
  },

  botonOff: {
    opacity: 0.45,
  },

  presionado: {
    opacity: 0.8,
  },

  previews: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },

  previewWrap: {
    position: "relative",
    width: 140,
    height: 140,
  },

  preview: {
    width: 140,
    height: 140,
    borderRadius: 12,
  },

  quitar: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },

  quitarTxt: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
});
