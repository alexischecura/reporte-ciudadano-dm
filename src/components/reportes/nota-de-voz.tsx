import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { eliminarArchivo, guardarAudio } from "../../servicios/almacenamiento";
import { solicitarPermiso } from "../../utils/permisos";

interface Props {
  audioUri: string | null;
  directorioBorrador: string;
  onCambiar: (uri: string | null) => void;
}

function formatoTiempo(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Nota de voz (Juanchi) — expo-audio.
 * Graba en .m4a alta calidad, reproduce/pausa, elimina.
 */
export function NotaDeVoz({ audioUri, directorioBorrador, onCambiar }: Props) {
  const colors = useTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(audioUri);
  const playStatus = useAudioPlayerStatus(player);
  const [procesando, setProcesando] = useState(false);

  if (playStatus.didJustFinish) {
    player.seekTo(0);
  }

  const asegurarMicrofono = () =>
    solicitarPermiso(
      async () => {
        const r = await requestRecordingPermissionsAsync();
        return { granted: r.granted, canAskAgain: r.canAskAgain, status: r.status };
      },
      {
        tituloDenegado: "Necesitamos el micrófono",
        mensajeDenegado: "Sin micrófono no podés grabar la nota de voz. ¿Intentamos de nuevo?",
        tituloBloqueado: "Micrófono bloqueado",
        mensajeBloqueado: "Bloqueaste el micrófono desde el sistema. Abrí Ajustes y activalo.",
      }
    );

  const empezar = async () => {
    const ok = await asegurarMicrofono();
    if (!ok) return;
    try {
      setProcesando(true);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert("No se pudo grabar", "Probá de nuevo en un momento.");
    } finally {
      setProcesando(false);
    }
  };

  const parar = async () => {
    try {
      setProcesando(true);
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const tmp = recorder.uri;
      if (tmp) {
        if (audioUri) eliminarArchivo(audioUri);
        const persistente = await guardarAudio(tmp, directorioBorrador);
        onCambiar(persistente);
      }
    } catch {
      Alert.alert("No se pudo guardar", "La nota no se pudo copiar al almacenamiento local.");
    } finally {
      setProcesando(false);
    }
  };

  const alternarReproduccion = async () => {
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (playStatus.playing) player.pause();
      else player.play();
    } catch {
      Alert.alert("No se pudo reproducir", "Probá de nuevo en un momento.");
    }
  };

  const eliminar = () => {
    if (audioUri) eliminarArchivo(audioUri);
    try {
      player.pause();
    } catch {
      // Mejor esfuerzo.
    }
    onCambiar(null);
  };

  const grabando = recState.isRecording;

  return (
    <View style={styles.cont}>
      <ThemedText style={styles.titulo}>Nota de voz (opcional)</ThemedText>
      {!audioUri && !grabando && (
        <Pressable
          style={[styles.boton, { backgroundColor: colors.primary }]}
          onPress={() => void empezar()}
          disabled={procesando}>
          <Text style={styles.botonTxt}>Grabar nota</Text>
        </Pressable>
      )}
      {grabando && (
        <View style={styles.fila}>
          <ThemedText style={styles.crono}>
            ● {formatoTiempo(recState.durationMillis)}
          </ThemedText>
          <Pressable
            style={[styles.boton, styles.botonStop, { backgroundColor: colors.error }]}
            onPress={() => void parar()}>
            <Text style={styles.botonTxt}>Parar</Text>
          </Pressable>
        </View>
      )}
      {audioUri && !grabando && (
        <View style={styles.fila}>
          <Pressable
            style={[styles.boton, styles.botonSec, { borderColor: colors.primary }]}
            onPress={() => void alternarReproduccion()}>
            <ThemedText style={styles.botonSecTxt} themeColor="primary">
              {playStatus.playing ? "Pausar" : "Escuchar"}
            </ThemedText>
          </Pressable>
          <ThemedText themeColor="textSecondary" style={styles.tiempo}>
            {formatoTiempo(playStatus.currentTime * 1000)} /{" "}
            {formatoTiempo(playStatus.duration * 1000)}
          </ThemedText>
          <Pressable onPress={eliminar}>
            <ThemedText themeColor="error" style={styles.eliminar}>
              Eliminar
            </ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cont: { gap: 8 },
  titulo: { fontSize: 18, fontWeight: "700" },
  fila: { flexDirection: "row", alignItems: "center", gap: 12 },
  boton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  botonTxt: { color: "#fff", fontSize: 17, fontWeight: "700" },
  botonStop: {},
  botonSec: { backgroundColor: "transparent", borderWidth: 1.5, flex: 1 },
  botonSecTxt: { fontSize: 17, fontWeight: "700" },
  crono: { fontSize: 17, fontWeight: "700", flex: 1 },
  tiempo: { fontSize: 14 },
  eliminar: { fontSize: 15, fontWeight: "700" },
});