import { Alert, Linking } from "react-native";

export interface ResultadoPermiso {
  granted: boolean;
  /** false cuando el SO ya no volverá a preguntar (hay que ir a Ajustes). */
  canAskAgain: boolean;
  status: string;
}

interface OpcionesPermiso {
  tituloDenegado: string;
  mensajeDenegado: string;
  tituloBloqueado: string;
  mensajeBloqueado: string;
  textoReintentar?: string;
  textoAjustes?: string;
  textoCancelar?: string;
}

/**
 * Helper reutilizable de permisos (Juanchi).
 * - Acepta -> sigue.
 * - Deniega 1ª vez (canAskAgain true) -> Alert con "Reintentar".
 * - Bloquea desde sistema (canAskAgain false) -> Alert con "Abrir ajustes".
 */
export async function solicitarPermiso(
  pedir: () => Promise<ResultadoPermiso>,
  opciones: OpcionesPermiso
): Promise<boolean> {
  const res = await pedir();
  if (res.granted) return true;

  if (!res.canAskAgain) {
    Alert.alert(opciones.tituloBloqueado, opciones.mensajeBloqueado, [
      { text: opciones.textoCancelar ?? "Cancelar", style: "cancel" },
      { text: opciones.textoAjustes ?? "Abrir ajustes", onPress: abrirConfiguracion },
    ]);
    return false;
  }

  Alert.alert(opciones.tituloDenegado, opciones.mensajeDenegado, [
    { text: opciones.textoCancelar ?? "Cancelar", style: "cancel" },
    {
      text: opciones.textoReintentar ?? "Reintentar",
      onPress: async () => {
        const segundo = await pedir();
        if (!segundo.granted && !segundo.canAskAgain) {
          Alert.alert(opciones.tituloBloqueado, opciones.mensajeBloqueado, [
            { text: opciones.textoCancelar ?? "Cancelar", style: "cancel" },
            { text: opciones.textoAjustes ?? "Abrir ajustes", onPress: abrirConfiguracion },
          ]);
        }
      },
    },
  ]);
  return false;
}

export function abrirConfiguracion(): void {
  void Linking.openSettings();
}
