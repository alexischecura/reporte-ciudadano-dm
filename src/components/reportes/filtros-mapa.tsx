import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ESTADOS_REPORTE } from "@/utils/ubicacion";
import { abrirConfiguracion } from "@/utils/permisos";
import type { EstadoReporte, TipoDeReporte } from "@/tipos";

type Props = {
  tipos: TipoDeReporte[];
  tipoId: string | null;
  estado: EstadoReporte | null;
  abiertos: boolean;
  cerca: boolean;
  buscandoUbicacion: boolean;
  errorUbicacion: string | null;
  permisoBloqueado: boolean;
  cargando: boolean;
  sinResultados: boolean;
  cantidad: number;
  onTipo: (tipoId: string | null) => void;
  onEstado: (estado: EstadoReporte | null) => void;
  onAlternar: () => void;
  onCercania: () => void;
  onLimpiar: () => void;
};

function Opcion({ nombre, seleccionada, onPress }: {
  nombre: string;
  seleccionada: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionada }}
      onPress={onPress}
      style={[styles.chip, seleccionada && styles.chipActivo]}
    >
      <Text style={[styles.texto, seleccionada && styles.textoActivo]}>{nombre}</Text>
    </Pressable>
  );
}

export function FiltrosMapa({
  tipos, tipoId, estado, abiertos, cerca, buscandoUbicacion,
  errorUbicacion, permisoBloqueado, cargando, sinResultados,
  cantidad, onTipo, onEstado, onAlternar, onCercania, onLimpiar,
}: Props) {
  const cantidadFiltros = Number(!!tipoId) + Number(!!estado) + Number(cerca);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.panel}>
      <View style={styles.cabecera}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Explorar reportes</Text>
          <Text style={styles.resumen} accessibilityLiveRegion="polite">
            {cargando ? "Cargando reportes…" : `${cantidad} ${cantidad === 1 ? "reporte" : "reportes"}${cerca ? " a 1 km o menos" : " en el mapa"}`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: abiertos }}
          onPress={onAlternar}
          style={[styles.chip, abiertos && styles.chipActivo]}
        >
          <Ionicons name="options-outline" size={18} color={abiertos ? "#fff" : "#1F6FEB"} />
          <Text style={[styles.texto, abiertos && styles.textoActivo]}>
            Filtros{cantidadFiltros ? ` (${cantidadFiltros})` : ""}
          </Text>
        </Pressable>
      </View>
      <View style={styles.cabecera}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: cerca, disabled: buscandoUbicacion }}
          disabled={buscandoUbicacion}
          onPress={onCercania}
          style={[styles.chip, cerca && styles.chipActivo]}
        >
          {buscandoUbicacion ? <ActivityIndicator size="small" color="#1F6FEB" /> : (
            <Ionicons name="locate-outline" size={18} color={cerca ? "#fff" : "#1F6FEB"} />
          )}
          <Text style={[styles.texto, cerca && styles.textoActivo]}>
            {buscandoUbicacion ? "Buscando ubicación…" : "Cerca de mí · 1 km"}
          </Text>
        </Pressable>
        {!!cantidadFiltros && (
          <Pressable accessibilityRole="button" style={styles.accion} onPress={onLimpiar}>
            <Text style={styles.texto}>Limpiar</Text>
          </Pressable>
        )}
      </View>
      {abiertos && (
        <>
          <Text style={styles.etiqueta}>Tipo de problema</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
            <Opcion nombre="Todos los tipos" seleccionada={tipoId === null} onPress={() => onTipo(null)} />
            {tipos.map((tipo) => (
              <Opcion key={tipo.id} nombre={tipo.nombre} seleccionada={tipoId === tipo.id} onPress={() => onTipo(tipo.id)} />
            ))}
          </ScrollView>
          <Text style={styles.etiqueta}>Estado</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
            <Opcion nombre="Todos los estados" seleccionada={estado === null} onPress={() => onEstado(null)} />
            {ESTADOS_REPORTE.map(({ valor, nombre }) => (
              <Opcion key={valor} nombre={nombre} seleccionada={estado === valor} onPress={() => onEstado(valor)} />
            ))}
          </ScrollView>
        </>
      )}
      {errorUbicacion && <Text style={styles.error} accessibilityLiveRegion="polite">{errorUbicacion}</Text>}
      {permisoBloqueado && (
        <Pressable accessibilityRole="button" onPress={abrirConfiguracion} style={styles.accion}>
          <Text style={styles.texto}>Abrir ajustes</Text>
        </Pressable>
      )}
      {sinResultados && <Text style={styles.resumen}>No hay reportes para esta búsqueda. Probá cambiar los filtros o explorar otra zona.</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "#FFFFFF", padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: "#E8ECF0" },
  cabecera: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 },
  titulo: { fontSize: 20, fontWeight: "700", color: "#152033" },
  resumen: { fontSize: 14, color: "#60646C", marginTop: 3 },
  etiqueta: { fontSize: 14, fontWeight: "700", color: "#253046" },
  fila: { gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: "#F0F3F7", borderWidth: 1, borderColor: "#E0E7EF" },
  chipActivo: { backgroundColor: "#1F6FEB", borderColor: "#1F6FEB" },
  texto: { color: "#1F6FEB", fontSize: 14, fontWeight: "600" },
  textoActivo: { color: "#FFFFFF" },
  accion: { minHeight: 44, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  error: { color: "#991B1B", fontSize: 14, fontWeight: "600" },
});
