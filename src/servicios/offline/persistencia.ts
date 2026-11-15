import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import type { EstadoLocal } from "../../tipos/offline";
import { estadoVacio, type PersistenciaLocal } from "./motor";

const AMBITO_API = process.env.EXPO_PUBLIC_API_URL ?? "sin-api";
let db: SQLiteDatabase | undefined;
function base() {
  if (!db) {
    const conexion = openDatabaseSync("reportes-offline.db");
    try {
      conexion.execSync(
        "PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; CREATE TABLE IF NOT EXISTS datos_locales (clave TEXT PRIMARY KEY NOT NULL, valor TEXT NOT NULL);",
      );
      db = conexion;
    } catch (error) {
      conexion.closeSync();
      throw error;
    }
  }
  return db;
}
let revision = 0;
const oyentes = new Set<() => void>();
export function suscribirDatosLocales(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}
export const revisionLocal = () => revision;
export function leerLocal<T>(clave: string): T | null {
  const fila = base().getFirstSync<{ valor: string }>(
    "SELECT valor FROM datos_locales WHERE clave = ?",
    `${AMBITO_API}:${clave}`,
  );
  return fila ? (JSON.parse(fila.valor) as T) : null;
}
export function guardarLocal(clave: string, valor: unknown) {
  base().runSync(
    "INSERT INTO datos_locales (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
    `${AMBITO_API}:${clave}`,
    JSON.stringify(valor),
  );
  revision++;
  oyentes.forEach((o) => {
    try {
      o();
    } catch {
      console.warn("No se pudo actualizar una vista de los datos locales.");
    }
  });
}
export function nuevoIdLocal(): string {
  return `rep-${base().getFirstSync<{ id: string }>("SELECT lower(hex(randomblob(16))) AS id")!.id}`;
}
export const persistencia: PersistenciaLocal = {
  leer(usuarioId) {
    const estado = leerLocal<EstadoLocal>(`reportes:${usuarioId}`);
    if (estado && estado.version !== 1)
      throw new Error(
        "La versión de los reportes guardados no es compatible. Actualizá la app sin borrar sus datos.",
      );
    return estado ?? estadoVacio();
  },
  guardar(usuarioId, estado) {
    guardarLocal(`reportes:${usuarioId}`, estado);
  },
};
