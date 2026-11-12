import { Redirect } from "expo-router";

// La ruta experimental conserva el acceso al mapa integrado.
export default function ExploreScreen() {
  return <Redirect href="/mapa" />;
}
