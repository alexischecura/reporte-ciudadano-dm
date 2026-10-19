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
import { crearReporte, listarTiposDeReporte } from "../servicios/reportes";
import type { Reporte, TipoDeReporte } from "../tipos";
import { useSesion } from "../contexts/sesion-context";
import { esError } from "../tipos/api";

import { SafeAreaView } from "react-native-safe-area-context";
import { NotaDeVoz } from "../components/reportes/nota-de-voz";
import { SeccionFoto } from "../components/reportes/seccion-foto";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";

const DIRECTORIO_BORRADOR = `borrador-${Date.now()}`;

const COORDS_MOCK = { latitud: -33.0089, longitud: -58.5142 };
const DIRECCION_MOCK = "Rocamora 1240";
const ZONA_MOCK = "zon-norte";

export default function ReportarScreen() {
  const colors = useTheme();
  const { usuario } = useSesion();
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
    if (!usuario) {
      setErrorEnvio("Tenés que iniciar sesión para crear un reporte.");
      return;
    }
    setEnviando(true);
    setErrorEnvio(null);

    const resultado = await crearReporte(
      {
        tipoId,
        descripcion: descripcion.trim().length > 0 ? descripcion.trim() : null,
        fotos,
        audioUrl: audioUri,
        coordenadas: COORDS_MOCK,
        direccion: DIRECCION_MOCK,
        zonaId: ZONA_MOCK,
      },
      usuario.id,
    );

    setEnviando(false);

    if (esError(resultado)) {
      setErrorEnvio(resultado.error.mensaje);
      return;
    }

    setExito(resultado.datos);
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
      <ThemedView style={styles.safe}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.exito}>
            <ThemedText style={styles.exitoTitulo}>¡Listo!</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.exitoTxt}>
              Tu reporte se guardó.
            </ThemedText>
            <ThemedText themeColor="primary" style={styles.codigo}>
              {exito.codigo}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.exitoTxt}>
              Guardalo para seguir tu reclamo en el mostrador.
            </ThemedText>
            <Pressable
              style={[styles.boton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setExito(null);
                setTipoId(null);
                setFotos([]);
                setDescripcion("");
                setAudioUri(null);
              }}
            >
              <Text style={styles.botonTxt}>Crear otro reporte</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.safe}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.cont}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText style={styles.titulo}>Nuevo reporte</ThemedText>

          <ThemedText style={styles.seccion}>¿Qué pasa?</ThemedText>
          {cargandoTipos ? (
            <ActivityIndicator />
          ) : errorTipos ? (
            <ThemedView type="backgroundElement" style={styles.errorBox}>
              <ThemedText themeColor="error" style={styles.errorTxt}>
                {errorTipos}
              </ThemedText>
              <Pressable
                style={[styles.botonSec, { borderColor: colors.primary }]}
                onPress={() => void reintentarTipos()}
              >
                <ThemedText themeColor="primary" style={styles.botonSecTxt}>
                  Reintentar
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : tipos.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.sub}>
              No hay tipos de problema disponibles.
            </ThemedText>
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
                      activo && {
                        backgroundColor: t.color,
                        borderColor: t.color,
                      },
                    ]}
                  >
                    {activo ? (
                      <Text style={[styles.chipTxt, { color: "#fff" }]}>
                        {t.nombre}
                      </Text>
                    ) : (
                      <ThemedText style={styles.chipTxt}>{t.nombre}</ThemedText>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          <SeccionFoto
            fotos={fotos}
            directorioBorrador={DIRECTORIO_BORRADOR}
            onCambiar={setFotos}
          />

          <View style={styles.bloque}>
            <ThemedText style={styles.seccion}>¿Dónde?</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.sub}>
              {DIRECCION_MOCK} — a 12 m de vos (GPS mockeado, lo conecta Alexis).
            </ThemedText>
          </View>

          <View style={styles.bloque}>
            <ThemedText style={styles.seccion}>Contanos (opcional)</ThemedText>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.backgroundSelected, color: colors.text },
              ]}
              placeholder="Ej: Pozo grande en la mano hacia el centro..."
              placeholderTextColor={colors.textSecondary}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              maxLength={500}
            />
          </View>

          <NotaDeVoz
            audioUri={audioUri}
            directorioBorrador={DIRECTORIO_BORRADOR}
            onCambiar={setAudioUri}
          />

          {errorEnvio && (
            <ThemedView type="backgroundElement" style={styles.errorBox}>
              <ThemedText themeColor="error" style={styles.errorTxt}>
                {errorEnvio}
              </ThemedText>
            </ThemedView>
          )}

          <Pressable
            style={[
              styles.boton,
              { backgroundColor: colors.primary },
              !puedeEnviar && styles.botonOff,
            ]}
            disabled={!puedeEnviar}
            onPress={() => void enviar()}
          >
            {enviando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTxt}>ENVIAR</Text>
            )}
          </Pressable>
          {!puedeEnviar && (
            <ThemedText themeColor="textSecondary" style={styles.ayuda}>
              Elegí el tipo de problema y agregá al menos 1 foto para enviar.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  cont: { padding: 16, gap: 16, paddingBottom: 40 },
  titulo: { fontSize: 24, fontWeight: "800" },
  seccion: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  sub: { fontSize: 14 },
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
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 90,
    textAlignVertical: "top",
  },
  boton: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
  },
  botonOff: { opacity: 0.4 },
  botonTxt: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
  botonSec: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 8,
  },
  botonSecTxt: { fontSize: 16, fontWeight: "700" },
  errorBox: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  errorTxt: { fontSize: 14 },
  ayuda: { fontSize: 13, textAlign: "center" },
  exito: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  exitoTitulo: { fontSize: 32, fontWeight: "800" },
  exitoTxt: { fontSize: 16, textAlign: "center" },
  codigo: { fontSize: 24, fontWeight: "800" },
});