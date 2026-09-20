import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NotaDeVoz } from "../components/reportes/nota-de-voz";
import { SeccionFoto } from "../components/reportes/seccion-foto";
import { crearReporte, listarTiposDeReporte } from "../servicios/reportes";
import type { Reporte, TipoDeReporte } from "../tipos";

// Fuera del render: evita error react-hooks/purity con reactCompiler.
const DIRECTORIO_BORRADOR = `borrador-${Date.now()}`;

// Mock de ubicación hasta que Alexis conecte expo-location + mapa.
// TODO(Alexis): GPS real, corrección arrastrando marcador, zona automática, duplicados <50m.
const COORDS_MOCK = { latitud: -33.0089, longitud: -58.5142 };
const DIRECCION_MOCK = "Rocamora 1240";
const ZONA_MOCK = "zon-norte";

/**
 * Pantalla de creación de reportes (Juanchi — Módulo del Vecino).
 * Boceto PRD: tipo -> foto(s) -> dónde -> contanos -> ENVIAR -> éxito con código.
 */
export default function ReportarScreen() {
  const [tipos, setTipos] = useState<TipoDeReporte[]>([]);
  const [cargandoTipos, setCargandoTipos] = useState(true);
  const [errorTipos, setErrorTipos] = useState<string | null>(null);

  const [tipoId, setTipoId] = useState<string | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [exito, setExito] = useState<Reporte | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        setCargandoTipos(true);
        setErrorTipos(null);
        const lista = await listarTiposDeReporte();
        if (vivo) setTipos(lista);
      } catch {
        if (vivo) setErrorTipos("No se pudieron cargar los tipos. Reintentá.");
      } finally {
        if (vivo) setCargandoTipos(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const puedeEnviar = tipoId !== null && fotos.length >= 1 && !enviando;

  const enviar = async () => {
    if (!puedeEnviar || !tipoId) return;
    try {
      setEnviando(true);
      setErrorEnvio(null);
      const reporte = await crearReporte({
        tipoId,
        descripcion: descripcion.trim().length > 0 ? descripcion.trim() : null,
        fotos,
        audioUrl: audioUri,
        coordenadas: COORDS_MOCK,
        direccion: DIRECCION_MOCK,
        zonaId: ZONA_MOCK,
      });
      setExito(reporte);
    } catch (e) {
      setErrorEnvio(e instanceof Error ? e.message : "No se pudo crear el reporte.");
    } finally {
      setEnviando(false);
    }
  };

  const reintentarTipos = async () => {
    try {
      setCargandoTipos(true);
      setErrorTipos(null);
      setTipos(await listarTiposDeReporte());
    } catch {
      setErrorTipos("No se pudieron cargar los tipos. Reintentá.");
    } finally {
      setCargandoTipos(false);
    }
  };

  if (exito) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.exito}>
          <Text style={styles.exitoTitulo}>¡Listo!</Text>
          <Text style={styles.exitoTxt}>Tu reporte se guardó.</Text>
          <Text style={styles.codigo}>{exito.codigo}</Text>
          <Text style={styles.exitoTxt}>Guardalo para seguir tu reclamo en el mostrador.</Text>
          <Pressable
            style={styles.boton}
            onPress={() => {
              setExito(null);
              setTipoId(null);
              setFotos([]);
              setDescripcion("");
              setAudioUri(null);
            }}>
            <Text style={styles.botonTxt}>Crear otro reporte</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.cont} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Nuevo reporte</Text>

        <Text style={styles.seccion}>¿Qué pasa?</Text>
        {cargandoTipos ? (
          <ActivityIndicator />
        ) : errorTipos ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTxt}>{errorTipos}</Text>
            <Pressable style={styles.botonSec} onPress={() => void reintentarTipos()}>
              <Text style={styles.botonSecTxt}>Reintentar</Text>
            </Pressable>
          </View>
        ) : tipos.length === 0 ? (
          <Text style={styles.sub}>No hay tipos de problema disponibles.</Text>
        ) : (
          <View style={styles.grilla}>
            {tipos.map((t) => {
              const activo = t.id === tipoId;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTipoId(t.id)}
                  style={[
                    styles.chip,
                    { borderColor: t.color },
                    activo && { backgroundColor: t.color, borderColor: t.color },
                  ]}>
                  <Text style={[styles.chipTxt, activo && styles.chipTxtActivo]}>{t.nombre}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <SeccionFoto fotos={fotos} directorioBorrador={DIRECTORIO_BORRADOR} onCambiar={setFotos} />

        <View style={styles.bloque}>
          <Text style={styles.seccion}>¿Dónde?</Text>
          <Text style={styles.sub}>
            {DIRECCION_MOCK} — a 12 m de vos (GPS mockeado, lo conecta Alexis).
          </Text>
        </View>

        <View style={styles.bloque}>
          <Text style={styles.seccion}>Contanos (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Pozo grande en la mano hacia el centro..."
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            maxLength={500}
          />
        </View>

        <NotaDeVoz audioUri={audioUri} directorioBorrador={DIRECTORIO_BORRADOR} onCambiar={setAudioUri} />

        {errorEnvio && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTxt}>{errorEnvio}</Text>
          </View>
        )}

        <Pressable
          style={[styles.boton, !puedeEnviar && styles.botonOff]}
          disabled={!puedeEnviar}
          onPress={() => void enviar()}>
          {enviando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.botonTxt}>ENVIAR</Text>
          )}
        </Pressable>
        {!puedeEnviar && (
          <Text style={styles.ayuda}>
            Elegí el tipo de problema y agregá al menos 1 foto para enviar.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  cont: { padding: 16, gap: 16, paddingBottom: 40 },
  titulo: { fontSize: 24, fontWeight: "800" },
  seccion: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  sub: { fontSize: 14, opacity: 0.7 },
  bloque: { gap: 4 },
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: "47%",
    flexGrow: 1,
    alignItems: "center",
  },
  chipTxt: { fontSize: 16, fontWeight: "700" },
  chipTxtActivo: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 90,
    textAlignVertical: "top",
  },
  boton: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
  },
  botonOff: { opacity: 0.4 },
  botonTxt: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  botonSec: {
    borderWidth: 1.5,
    borderColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 8,
  },
  botonSecTxt: { color: "#208AEF", fontSize: 16, fontWeight: "700" },
  errorBox: { backgroundColor: "#FDECEA", borderRadius: 12, padding: 12, gap: 8 },
  errorTxt: { color: "#8B1A1A", fontSize: 14 },
  ayuda: { fontSize: 13, opacity: 0.6, textAlign: "center" },
  exito: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  exitoTitulo: { fontSize: 32, fontWeight: "800" },
  exitoTxt: { fontSize: 16, textAlign: "center", opacity: 0.8 },
  codigo: { fontSize: 24, fontWeight: "800", color: "#208AEF" },
});
