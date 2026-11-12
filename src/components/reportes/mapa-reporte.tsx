import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { MapPressEvent, Marker, Region } from "react-native-maps";

import { useTheme } from "@/hooks/use-theme";

type Ubicacion = {
  latitude: number;
  longitude: number;
  direccion: string;
};

type Props = {
  onLocationSelect?: (ubicacion: Ubicacion) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
};

const CENTRO_GUALEGUAYCHU: Region = {
  latitude: -33.0089,
  longitude: -58.5142,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

const distanciaMetros = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) => {
  const R = 6371000;
  const rad = (n: number) => (n * Math.PI) / 180;

  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const lat1 = rad(a.latitude);
  const lat2 = rad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(Math.min(1, h)));
};

export default function SelectorUbicacion({
  onLocationSelect,
  initialLocation,
}: Props) {
  const colores = useTheme();
  const mapRef = useRef<MapView>(null);

  const [seleccion, setSeleccion] = useState<Ubicacion | null>(null);
  const [ubicacionActual, setUbicacionActual] =
    useState<Location.LocationObjectCoords | null>(null);
  const [region, setRegion] = useState<Region>({
    ...CENTRO_GUALEGUAYCHU,
    ...(initialLocation ?? {}),
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const obtenerDireccion = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        const resultados = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        const lugar = resultados[0];

        if (!lugar) {
          return "No se encontró una dirección para este punto";
        }

        const calle = [lugar.street, lugar.name]
          .filter((v, i, arr) => v && arr.indexOf(v) === i)
          .join(" ");

        const numero = lugar.streetNumber;
        const ciudad = lugar.city ?? lugar.district ?? lugar.subregion;

        const partes = [
          calle
            ? numero && !calle.includes(numero)
              ? `${calle} ${numero}`
              : calle
            : null,
          ciudad,
          lugar.region,
          lugar.postalCode,
          lugar.country,
        ].filter(Boolean);

        return partes.length
          ? [...new Set(partes)].join(", ")
          : "Dirección no disponible";
      } catch {
        return "No se pudo obtener la dirección";
      }
    },
    [],
  );

  const seleccionarPunto = useCallback(
    async (latitude: number, longitude: number) => {
      setCargando(true);
      setError("");

      try {
        const direccion = await obtenerDireccion(latitude, longitude);

        const nuevaUbicacion: Ubicacion = {
          latitude,
          longitude,
          direccion,
        };

        setSeleccion(nuevaUbicacion);
        onLocationSelect?.(nuevaUbicacion);
      } finally {
        setCargando(false);
      }
    },
    [obtenerDireccion, onLocationSelect],
  );

  const manejarToqueMapa = (evento: MapPressEvent) => {
    const { latitude, longitude } = evento.nativeEvent.coordinate;

    void seleccionarPunto(latitude, longitude);
  };

  const usarPosicionActual = async () => {
    setModalVisible(false);
    setCargando(true);
    setError("");

    try {
      const permiso = await Location.requestForegroundPermissionsAsync();

      if (permiso.status !== "granted") {
        setError(
          "No hay permiso de ubicación. Podés seleccionar un punto tocando el mapa.",
        );
        return;
      }

      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = posicion.coords;
      setUbicacionActual(coords);

      const nuevaRegion: Region = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      };

      setRegion(nuevaRegion);

      mapRef.current?.animateToRegion(nuevaRegion, 350);

      await seleccionarPunto(coords.latitude, coords.longitude);
    } catch {
      setError(
        "No se pudo obtener tu ubicación. Verificá que el GPS esté activado.",
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!initialLocation) return;

    const nuevaRegion = {
      ...CENTRO_GUALEGUAYCHU,
      ...initialLocation,
    };

    setRegion(nuevaRegion);

    void seleccionarPunto(initialLocation.latitude, initialLocation.longitude);
  }, [initialLocation?.latitude, initialLocation?.longitude]);

  // Si el punto seleccionado está a menos de 25 m,
  // no duplicamos el marcador de ubicación actual.
  const mostrarUbicacionActual =
    ubicacionActual != null &&
    (seleccion == null || distanciaMetros(ubicacionActual, seleccion) >= 25);

  const styles = StyleSheet.create({
    contenedor: {
      gap: 12,
    },
    mapa: {
      width: "100%",
      height: 200,
      borderRadius: 14,
    },
    boton: {
      backgroundColor: colores.primary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    botonTexto: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
    direccionBox: {
      backgroundColor: colores.backgroundElement,
      borderRadius: 12,
      padding: 14,
      gap: 8,
    },
    etiqueta: {
      color: colores.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    direccion: {
      color: colores.text,
      fontSize: 15,
      lineHeight: 22,
    },
    coordenadas: {
      color: colores.textSecondary,
      fontSize: 12,
    },
    textoAyuda: {
      color: colores.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    errorBox: {
      backgroundColor: colores.backgroundElement,
      borderRadius: 10,
      padding: 12,
      borderLeftWidth: 3,
      borderLeftColor: colores.error,
    },
    errorTexto: {
      color: colores.error,
      fontSize: 13,
    },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: 24,
    },
    modal: {
      backgroundColor: colores.background,
      borderRadius: 18,
      padding: 22,
      gap: 14,
    },
    modalTitulo: {
      color: colores.text,
      fontSize: 20,
      fontWeight: "800",
    },
    modalTexto: {
      color: colores.textSecondary,
      fontSize: 15,
      lineHeight: 23,
    },
    botonSecundario: {
      borderWidth: 1,
      borderColor: colores.backgroundSelected,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: "center",
    },
    botonSecundarioTexto: {
      color: colores.text,
      fontWeight: "700",
      fontSize: 15,
    },
  });

  return (
    <View style={styles.contenedor}>
      <View
        style={{
          overflow: "hidden",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colores.backgroundSelected,
        }}
      >
        <MapView
          ref={mapRef}
          style={styles.mapa}
          initialRegion={region}
          onPress={manejarToqueMapa}
          onRegionChangeComplete={setRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
        >
          {seleccion && (
            <Marker
              coordinate={{
                latitude: seleccion.latitude,
                longitude: seleccion.longitude,
              }}
              title="Ubicación seleccionada"
              description={seleccion.direccion}
              pinColor={colores.primary}
            />
          )}

          {mostrarUbicacionActual && ubicacionActual && (
            <Marker
              coordinate={{
                latitude: ubicacionActual.latitude,
                longitude: ubicacionActual.longitude,
              }}
              title="Tu ubicación actual"
              description="Tu posición aproximada"
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: colores.primary,
                  borderWidth: 4,
                  borderColor: colores.background,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "#fff",
                  }}
                />
              </View>
            </Marker>
          )}
        </MapView>
      </View>

      <Text style={styles.textoAyuda}>
        Tocá el mapa para seleccionar una ubicación o utilizá tu posición
        actual.
      </Text>

      <Pressable
        style={styles.boton}
        onPress={() => {
          setError("");
          setModalVisible(true);
        }}
        disabled={cargando}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#fff" />
        <Text style={styles.botonTexto}>Usar mi posición actual</Text>
      </Pressable>

      {cargando && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ActivityIndicator color={colores.primary} />
          <Text style={{ color: colores.textSecondary }}>
            Obteniendo ubicación o dirección...
          </Text>
        </View>
      )}

      {error !== "" && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      )}

      <View style={styles.direccionBox}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={21}
            color={colores.primary}
          />
          <Text style={styles.etiqueta}>Dirección seleccionada</Text>
        </View>

        <Text style={styles.direccion}>
          {seleccion?.direccion ?? "Seleccioná un punto en el mapa"}
        </Text>

        {seleccion && (
          <Text style={styles.coordenadas}>
            {seleccion.latitude.toFixed(6)}, {seleccion.longitude.toFixed(6)}
          </Text>
        )}
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <MaterialCommunityIcons
              name="map-marker-radius-outline"
              size={36}
              color={colores.primary}
            />

            <Text style={styles.modalTitulo}>¿Usar tu ubicación?</Text>

            <Text style={styles.modalTexto}>
              Necesitamos acceder a tu ubicación mientras usás la aplicación
              para identificar dónde estás, centrar el mapa y completar la
              dirección automáticamente.
              {"\n\n"}
              Tu ubicación se utiliza para esta selección. Podés continuar sin
              dar permiso y elegir cualquier punto tocando el mapa.
            </Text>

            <Pressable style={styles.boton} onPress={usarPosicionActual}>
              <Text style={styles.botonTexto}>Permitir y continuar</Text>
            </Pressable>

            <Pressable
              style={styles.botonSecundario}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.botonSecundarioTexto}>Ahora no</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
