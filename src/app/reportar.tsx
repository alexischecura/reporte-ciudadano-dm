import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { crearReporte, listarTiposDeReporte } from "../servicios/reportes";
import type { Reporte, TipoDeReporte } from "../tipos";

import { ReportesCercanos } from "@/components/reportes/reportes-cercanos";
import { useReportesCercanos } from "@/hooks/use-reportes-cercanos";
import SelectorUbicacion from "@/components/reportes/mapa-reporte";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { NotaDeVoz } from "../components/reportes/nota-de-voz";
import { SeccionFoto } from "../components/reportes/seccion-foto";
import { useSesion } from "../contexts/sesion-context";
import { esError } from "../tipos/api";

import {
  colaReportes,
  leerEstadoLocal,
  nuevoBorrador,
  misReportesLocales,
} from "@/servicios/offline/reportes-locales";
import {
  revisionLocal,
  suscribirDatosLocales,
} from "@/servicios/offline/persistencia";
import { tiposGuardados } from "@/servicios/offline/catalogo";
import type { BorradorLocal } from "@/tipos/offline";

export default function ReportarScreen() {
  const { usuario } = useSesion();
  if (!usuario) return null;
  return <FormularioReporte key={usuario.id} usuarioId={usuario.id} />;
}

function FormularioReporte({ usuarioId }: { usuarioId: string }) {
  const colors = useTheme();
  const { modoOffline } = useSesion();
  const revision = useSyncExternalStore(
    suscribirDatosLocales,
    revisionLocal,
    revisionLocal,
  );
  const [borrador, setBorrador] = useState<BorradorLocal>(
    () => leerEstadoLocal(usuarioId).borrador ?? nuevoBorrador(),
  );
  const borradorActual = useRef(borrador);
  const [ubicacionInicial, setUbicacionInicial] = useState(borrador.ubicacion);
  const editable = useRef(true);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const editar = (cambio: Partial<BorradorLocal>) => {
    if (!editable.current || borradorActual.current.id !== borrador.id)
      return false;
    try {
      const siguiente = { ...borradorActual.current, ...cambio };
      colaReportes.guardarBorrador(usuarioId, siguiente);
      borradorActual.current = siguiente;
      setBorrador(siguiente);
      setErrorGuardado(null);
      return true;
    } catch {
      setErrorGuardado(
        "No pudimos guardar los cambios en este teléfono. Revisá el espacio disponible antes de salir.",
      );
      return false;
    }
  };
  const {
    tipoId,
    fotos,
    descripcion,
    audioUrl: audioUri,
    ubicacion,
  } = borrador;
  const [tipos, setTipos] = useState<TipoDeReporte[]>([]);
  const [cargandoTipos, setCargandoTipos] = useState(true);
  const [errorTipos, setErrorTipos] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [adhiriendo, setAdhiriendo] = useState(false);
  const [esAdhesion, setEsAdhesion] = useState(false);
  const cercanos = useReportesCercanos(
    ubicacion
      ? { latitud: ubicacion.latitude, longitud: ubicacion.longitude }
      : null,
  );
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
    const desuscribir = suscribirDatosLocales(() => {
      if (vivo) setTipos(tiposGuardados());
    });
    return () => {
      vivo = false;
      desuscribir();
    };
  }, []);

  const puedeEnviar =
    tipoId !== null &&
    fotos.length >= 1 &&
    ubicacion !== null &&
    !enviando &&
    !adhiriendo &&
    !cercanos.cargando;

  const enviarReporte = async () => {
    if (!puedeEnviar || !tipoId) return;
    if (!ubicacion) {
      setErrorEnvio("Seleccioná la ubicación del problema en el mapa.");
      return;
    }
    if (!editable.current) return;
    editable.current = false;
    setEnviando(true);
    setErrorEnvio(null);

    try {
      const resultado = await crearReporte(
        {
          tipoId,
          descripcion:
            descripcion.trim().length > 0 ? descripcion.trim() : null,
          fotos,
          audioUrl: audioUri,
          coordenadas: {
            latitud: ubicacion.latitude,
            longitud: ubicacion.longitude,
          },
          direccion: ubicacion.direccion,
        },
        usuarioId,
        { id: borrador.id, creadoEn: borrador.creadoEn },
      );

      if (esError(resultado)) {
        editable.current = true;
        setErrorEnvio(resultado.error.mensaje);
        return;
      }

      setExito(resultado.datos);
    } catch {
      editable.current = true;
      setErrorEnvio("Ocurrió un error al enviar el reporte. Reintentá.");
    } finally {
      setEnviando(false);
    }
  };

  const enviar = () => {
    if (!puedeEnviar) return;
    if (cercanos.reportes.length || cercanos.error) {
      Alert.alert(
        cercanos.error
          ? "No pudimos verificar si ya está reportado"
          : "¿Se trata de otro problema?",
        cercanos.error
          ? "Podés reintentar la búsqueda de reportes cercanos antes de enviar o continuar con tu reporte."
          : "Hay reclamos abiertos a 50 m o menos. Revisalos y sumate si es el mismo problema.",
        [
          { text: "Volver a revisar", style: "cancel" },
          { text: "Enviar nuevo reporte", onPress: () => void enviarReporte() },
        ],
      );
      return;
    }
    void enviarReporte();
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

  const nuevoFormulario = () => {
    const nuevo = nuevoBorrador();
    colaReportes.guardarBorrador(usuarioId, nuevo);
    borradorActual.current = nuevo;
    setUbicacionInicial(null);
    editable.current = true;
    setBorrador(nuevo);
    setExito(null);
    setEsAdhesion(false);
  };
  // La revisión hace que el código aparezca cuando el gestor confirma el envío.
  void revision;
  const resultadoExito = exito
    ? (misReportesLocales(usuarioId).find((r) => r.id === exito.id) ?? exito)
    : null;
  if (resultadoExito) {
    return (
      <ThemedView style={styles.safe}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.exito}>
            <ThemedText style={styles.exitoTitulo}>¡Listo!</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.exitoTxt}>
              {esAdhesion
                ? "Ya estás sumado a este reclamo."
                : resultadoExito.sincronizado
                  ? "La Municipalidad recibió tu reporte."
                  : "Tu reporte quedó guardado en este teléfono. Se enviará automáticamente al recuperar conexión mientras uses la app."}
            </ThemedText>
            <ThemedText themeColor="primary" style={styles.codigo}>
              {resultadoExito.codigo || "Pendiente de envío"}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.exitoTxt}>
              {resultadoExito.sincronizado
                ? "Guardá el código para seguir tu reclamo en el mostrador."
                : "Podés ver el progreso y reintentar desde Mis reclamos. Las fotos y el audio siguen guardados."}
            </ThemedText>
            <Pressable
              style={[styles.botonSec, { borderColor: colors.primary }]}
              onPress={() => router.replace("/(tabs)/seguimiento")}
            >
              <Text style={[styles.botonSecTxt, { color: colors.primary }]}>
                Ver mis reclamos
              </Text>
            </Pressable>
            <Pressable
              style={[styles.boton, { backgroundColor: colors.primaryBackground }]}
              onPress={() => {
                try {
                  nuevoFormulario();
                } catch {
                  Alert.alert(
                    "No se pudo abrir otro borrador",
                    "Tu reporte anterior sigue guardado. Revisá el espacio disponible.",
                  );
                }
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
          pointerEvents={enviando || adhiriendo ? "none" : "auto"}
        >
          <ThemedText style={styles.titulo}>Nuevo reporte</ThemedText>
          <Pressable
            style={[styles.botonSec, { borderColor: colors.primary }]}
            onPress={() => router.push("/seguimiento")}
          >
            <Text style={[styles.botonSecTxt, { color: colors.primary }]}>
              Ver mis reclamos
            </Text>
          </Pressable>

          <ThemedText themeColor="textSecondary">
            {modoOffline
              ? "Sin conexión: podés completar y guardar tu reporte."
              : "El borrador se guarda en este teléfono mientras lo completás."}
          </ThemedText>
          {errorGuardado && (
            <ThemedText themeColor="error" accessibilityRole="alert">
              {errorGuardado}
            </ThemedText>
          )}
          <Pressable
            style={[styles.botonSec, { borderColor: colors.primary }]}
            onPress={() =>
              Alert.alert(
                "¿Descartar el borrador?",
                "Se eliminarán los datos y archivos de este borrador. Los reportes en cola se conservan.",
                [
                  { text: "Conservar", style: "cancel" },
                  {
                    text: "Descartar",
                    style: "destructive",
                    onPress: () => {
                      try {
                        colaReportes.descartarBorrador(usuarioId);
                        nuevoFormulario();
                      } catch {
                        setErrorGuardado("No pudimos descartar el borrador.");
                      }
                    },
                  },
                ],
              )
            }
          >
            <Text style={[styles.botonSecTxt, { color: colors.primary }]}>
              Descartar borrador
            </Text>
          </Pressable>
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
                <Text style={[styles.botonSecTxt, { color: colors.primary }]}>
                  Reintentar
                </Text>
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
                    onPress={() => editar({ tipoId: t.id })}
                    style={[
                      styles.chip,
                      { borderColor: t.color },
                      activo && {
                        backgroundColor: t.color,
                        borderColor: t.color,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipTxt,
                        { color: activo ? "#fff" : colors.text },
                      ]}
                    >
                      {t.nombre}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <SeccionFoto
            fotos={fotos}
            directorioBorrador={borrador.id}
            onCambiar={async (nuevas) => {
              if (!editar({ fotos: nuevas }))
                throw new Error("No se pudo guardar la foto en el borrador.");
            }}
          />

          <View style={styles.bloque}>
            <ThemedText style={styles.seccion}>¿Dónde?</ThemedText>
            <SelectorUbicacion
              reportesCercanos={cercanos.reportes}
              key={borrador.id}
              initialLocation={ubicacionInicial ?? undefined}
              onLocationSelect={(punto) => {
                editar({ ubicacion: punto });
              }}
            />

            {ubicacion && (
              <ReportesCercanos
                key={`${ubicacion.latitude}:${ubicacion.longitude}`}
                reportes={cercanos.reportes}
                tipos={tipos}
                coordenadas={{
                  latitud: ubicacion.latitude,
                  longitud: ubicacion.longitude,
                }}
                cargando={cercanos.cargando}
                error={cercanos.error}
                onReintentar={cercanos.reintentar}
                onOcupado={setAdhiriendo}
                onAdherido={(reporte) => {
                  setEsAdhesion(true);
                  setExito(reporte);
                }}
              />
            )}
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
              onChangeText={(texto) => editar({ descripcion: texto })}
              multiline
              maxLength={500}
            />
          </View>

          <NotaDeVoz
            audioUri={audioUri}
            directorioBorrador={borrador.id}
            onCambiar={async (audioUrl) => {
              if (!editar({ audioUrl }))
                throw new Error("No se pudo guardar el audio en el borrador.");
            }}
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
              { backgroundColor: colors.primaryBackground },
              !puedeEnviar && styles.botonOff,
            ]}
            disabled={!puedeEnviar}
            onPress={() => void enviar()}
          >
            {enviando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTxt}>GUARDAR Y ENVIAR</Text>
            )}
          </Pressable>
          {!puedeEnviar && !cercanos.cargando && (
            <ThemedText themeColor="textSecondary" style={styles.ayuda}>
              Elegí el tipo de problema, seleccioná la ubicación en el mapa y
              agregá al menos 1 foto para enviar.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  cont: { padding: 16, gap: 16, paddingBottom: 40, flexGrow: 1 },
  titulo: { fontSize: 24, fontWeight: "800", flexShrink: 1 },
  seccion: { fontSize: 18, fontWeight: "700", marginBottom: 8, flexShrink: 1 },
  sub: { fontSize: 14 },
  bloque: { gap: 4 },
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%" },
  chip: {
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 0,
    minHeight: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  chipTxt: {
    fontSize: 16,
    fontWeight: "700",
    width: "100%",
    textAlign: "center",
    flexShrink: 1,
    flexWrap: "wrap",
    includeFontPadding: true,
  },
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
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64,
    marginTop: 8,
  },
  botonOff: { opacity: 0.4 },
  botonTxt: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.3,
    textAlign: "center",
    flexShrink: 1,
    flexWrap: "wrap",
    width: "100%",
    includeFontPadding: true,
  },
  botonSec: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    marginTop: 8,
  },
  botonSecTxt: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
    flexWrap: "wrap",
    width: "100%",
    includeFontPadding: true,
  },
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
