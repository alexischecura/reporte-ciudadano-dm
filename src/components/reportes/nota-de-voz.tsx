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
 * El archivo se persiste a document/ al parar de grabar.
 */
export function NotaDeVoz({ audioUri, directorioBorrador, onCambiar }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(audioUri);
  const playStatus = useAudioPlayerStatus(player);
  const [procesando, setProcesando] = useState(false);

  // Cuando termina de reproducir, vuelve al inicio.
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
        // Si había una nota anterior, se reemplaza.
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
      <Text style={styles.titulo}>Nota de voz (opcional)</Text>
      {!audioUri && !grabando && (
        <Pressable style={styles.boton} onPress={() => void empezar()} disabled={procesando}>
          <Text style={styles.botonTxt}>Grabar nota</Text>
        </Pressable>
      )}
      {grabando && (
        <View style={styles.fila}>
          <Text style={styles.crono}>● {formatoTiempo(recState.durationMillis)}</Text>
          <Pressable style={[styles.boton, styles.botonStop]} onPress={() => void parar()}>
            <Text style={styles.botonTxt}>Parar</Text>
          </Pressable>
        </View>
      )}
      {audioUri && !grabando && (
        <View style={styles.fila}>
          <Pressable style={[styles.boton, styles.botonSec]} onPress={() => void alternarReproduccion()}>
            <Text style={styles.botonSecTxt}>{playStatus.playing ? "Pausar" : "Escuchar"}</Text>
          </Pressable>
          <Text style={styles.tiempo}>
            {formatoTiempo(playStatus.currentTime * 1000)} / {formatoTiempo(playStatus.duration * 1000)}
          </Text>
          <Pressable onPress={eliminar}>
            <Text style={styles.eliminar}>Eliminar</Text>
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
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  botonTxt: { color: "#fff", fontSize: 17, fontWeight: "700" },
  botonStop: { backgroundColor: "#C1440E" },
  botonSec: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "#208AEF", flex: 1 },
  botonSecTxt: { color: "#208AEF", fontSize: 17, fontWeight: "700" },
  crono: { fontSize: 17, fontWeight: "700", flex: 1 },
  tiempo: { fontSize: 14, opacity: 0.7 },
  eliminar: { color: "#C1440E", fontSize: 15, fontWeight: "700" },
});
