import { MOCK_REPORTES } from "@/mocks/reportes.mock";
import { useMemo, useRef, useState } from "react";
import { Button, View } from "react-native";
//import { WebView } from "react-native-webview";

export default function Mapa() {
  const misReportes = useMemo(() => MOCK_REPORTES, []);
  const webViewRef = useRef(null);
  const [mapaListo, setMapaListo] = useState(false);
  const [buscando, setBuscando] = useState(false);

  async function mostrarMiUbicacion() {
    // setBuscando(true);

    //     try {
    //       const { status } = await Location.requestForegroundPermissionsAsync();

    //       if (status !== "granted") {
    //         Alert.alert(
    //           "Permiso necesario",
    //           "Permití el acceso a la ubicación para mostrarla en el mapa.",
    //         );
    //         return;
    //       }

    //       const ubicacion = await Location.getCurrentPositionAsync({
    //         accuracy: Location.Accuracy.High,
    //       });

    //       const { latitude, longitude } = ubicacion.coords;

    //       webViewRef.current?.injectJavaScript(`
    //       window.mostrarUbicacion(${latitude}, ${longitude});
    //       true;
    //     `);
    //     } catch {
    //       Alert.alert(
    //         "No se pudo obtener la ubicación",
    //         "Verificá que la ubicación del celular esté activada.",
    //       );
    //     } finally {
    //       setBuscando(false);
    //     }
    //   }

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0">

        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />

        <style>
          html, body, #map {
            height: 100%;
            width: 100%;
            margin: 0;
          }
        </style>
      </head>

      <body>
        <div id="map"></div>

        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

        <script>
        const map = L.map("map").setView(
          [-33.0094, -58.5172],
          13
        );

        L.tileLayer(
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }
        ).addTo(map);

        let marcadorUsuario;

        window.mostrarUbicacion = function (latitud, longitud) {
          const coordenadas = [latitud, longitud];

          if (marcadorUsuario) {
            marcadorUsuario.setLatLng(coordenadas);
          } else {
            marcadorUsuario = L.circleMarker(coordenadas, {
              radius: 9,
              color: "#ffffff",
              weight: 3,
              fillColor: "#2563eb",
              fillOpacity: 1,
            })
              .addTo(map)
              .bindPopup("Tu ubicación");
          }

          map.setView(coordenadas, 16);
        };

        const tipoReporte = {
            "tip-bache": "Bache",
            "tip-luminaria": "Luminaria",
            "tip-arbol": "Árbol",
            "tip-basura": "Basura",
            "tip-vereda": "Vereda",
          };

          const reportes = ${JSON.stringify(misReportes).replace(/</g, "\\u003c")};

          reportes.forEach((reporte) => {
            const etiqueta = document.createElement("button");
            etiqueta.innerText = "Ver reporte " + reporte.codigo + " - " + tipoReporte[reporte.tipoId];

            etiqueta.onclick = () => {

            };

            L.marker([
              Number(reporte.coordenadas.latitud),
              Number(reporte.coordenadas.longitud)
              ])
              .addTo(map)
              .bindPopup(etiqueta);
          });

          window.ReactNativeWebView.postMessage("mapa-listo");
          </script>
      </body>
    </html>
    `;

    return (
      <View style={{ flex: 1 }}>
        {/* <WebView
        ref={webViewRef}
        style={{ flex: 1, marginTop: 40 }}
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(event) => {
          if (event.nativeEvent.data === "mapa-listo") {
            setMapaListo(true);
          }
        }}
      /> */}

        <Button
          title={buscando ? "Buscando ubicación..." : "Mi ubicación"}
          onPress={mostrarMiUbicacion}
          disabled={!mapaListo || buscando}
        />
      </View>
    );
  }
}
