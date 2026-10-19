import { Directory, File, Paths } from "expo-file-system";

/**
 * Almacenamiento persistente de multimedia (Juanchi).
 * Copia foto/audio desde URI temporal (cache de cámara/picker/grabadora)
 * a `document/reportes/<id>/` que sobrevive reinicios.
 *
 * Usa la API NUEVA de expo-file-system: File, Directory, Paths.
 * No usar `expo-file-system/legacy` (tira error en runtime SDK 57).
 */

function directorioReporte(id: string): Directory {
  return new Directory(Paths.document, "reportes", id);
}

function extensionDe(uri: string, fallback: string): string {
  const i = uri.lastIndexOf(".");
  if (i < 0) return fallback;
  const ext = uri.slice(i);
  // Evita query params (?...) y extensiones absurdas.
  if (ext.length < 2 || ext.length > 6 || ext.includes("/") || ext.includes("?")) {
    return fallback;
  }
  return ext;
}

async function copiarAReporte(uriTemporal: string, id: string, nombreBase: string): Promise<string> {
  const dir = directorioReporte(id);
  if (!dir.exists) {
    dir.create({ idempotent: true, intermediates: true });
  }
  const origen = new File(uriTemporal);
  const esAudio = nombreBase.startsWith("audio");
  const destino = new File(dir, `${nombreBase}${extensionDe(uriTemporal, esAudio ? ".m4a" : ".jpg")}`);
  await origen.copy(destino);
  return destino.uri;
}

/** Guarda una foto en persistente y devuelve su URI. */
export async function guardarFoto(uriTemporal: string, idReporte: string): Promise<string> {
  const nombre = `foto-${Date.now()}`;
  return copiarAReporte(uriTemporal, idReporte, nombre);
}

/** Guarda el audio .m4a en persistente y devuelve su URI. */
export async function guardarAudio(uriTemporal: string, idReporte: string): Promise<string> {
  return copiarAReporte(uriTemporal, idReporte, `audio-${Date.now()}`);
}

/** Elimina un archivo puntual (quitar foto o borrar nota de voz). No falla si ya no existe. */
export function eliminarArchivo(uri: string): void {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Mejor esfuerzo: si el archivo ya se movió/limpió, no romper el flujo.
  }
}

/** Limpia toda la carpeta del reporte (al cancelar o tras sincronizar). */
export function limpiarReporte(idReporte: string): void {
  try {
    const dir = directorioReporte(idReporte);
    if (dir.exists) dir.delete();
  } catch {
    // Mejor esfuerzo.
  }
}
