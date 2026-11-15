import type {
  BorradorLocal,
  EnvioLocal,
  EstadoLocal,
} from "../../tipos/offline";
import type { BorradorReporte, Reporte } from "../../tipos";

export interface PersistenciaLocal {
  leer(usuarioId: string): EstadoLocal;
  guardar(usuarioId: string, estado: EstadoLocal): void;
}
export interface TransporteCola {
  vigente(): Promise<boolean>;
  buscar(id: string): Promise<Reporte | null>;
  subir(uri: string): Promise<string>;
  crear(payload: Record<string, unknown>): Promise<Reporte>;
  limpiar(id: string): void;
}

export const estadoVacio = (): EstadoLocal => ({
  version: 1,
  borrador: null,
  envios: [],
  reportes: [],
  limpieza: [],
});

export function reportePendiente(
  envio: EnvioLocal,
  usuarioId: string,
): Reporte {
  return {
    ...envio.contenido,
    id: envio.id,
    codigo: "",
    creadoEn: envio.creadoEn,
    fotos: envio.contenido.fotos.map((url, i) => ({
      id: `fot-${envio.id.slice(4)}-${i}`,
      url,
      momento: "problema",
    })),
    zonaId: "",
    estado: "recibido",
    autorId: usuarioId,
    cuadrillaId: null,
    duplicadoDe: null,
    adhesiones: 0,
    sincronizado: false,
  };
}

export function esReintentable(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  return (
    status == null ||
    status === 0 ||
    status === 408 ||
    status === 429 ||
    status >= 500
  );
}

/** La única autoridad es el estado persistido. Cada paso se confirma antes de seguir. */
export class MotorCola {
  private trabajos = new Map<string, Promise<void>>();
  constructor(
    private almacenamiento: PersistenciaLocal,
    private ahora = Date.now,
  ) {}

  private cambiar(usuarioId: string, cambiar: (estado: EstadoLocal) => void) {
    const estado = this.almacenamiento.leer(usuarioId);
    cambiar(estado);
    this.almacenamiento.guardar(usuarioId, estado);
  }

  guardarBorrador(usuarioId: string, borrador: BorradorLocal) {
    this.cambiar(usuarioId, (e) => {
      if (
        e.envios.some((x) => x.id === borrador.id) ||
        e.reportes.some((x) => x.id === borrador.id)
      ) {
        throw new Error(
          "Este reporte ya se guardó para enviar. Continuá desde Mis reclamos.",
        );
      }
      e.borrador = borrador;
    });
  }

  descartarBorrador(usuarioId: string) {
    this.cambiar(usuarioId, (e) => {
      if (e.borrador) e.limpieza.push(e.borrador.id);
      e.borrador = null;
    });
  }

  encolar(
    usuarioId: string,
    id: string,
    creadoEn: string,
    contenido: BorradorReporte,
  ): Reporte {
    if (
      !contenido.tipoId ||
      contenido.fotos.length < 1 ||
      contenido.fotos.length > 2 ||
      !Number.isFinite(contenido.coordenadas.latitud) ||
      !Number.isFinite(contenido.coordenadas.longitud) ||
      Math.abs(contenido.coordenadas.latitud) > 90 ||
      Math.abs(contenido.coordenadas.longitud) > 180
    ) {
      throw new Error(
        "Elegí el tipo, la ubicación y una o dos fotos antes de guardar.",
      );
    }
    let pendiente!: EnvioLocal;
    this.cambiar(usuarioId, (e) => {
      const existente = e.envios.find((x) => x.id === id);
      pendiente = existente ?? {
        id,
        creadoEn,
        contenido,
        fotosSubidas: contenido.fotos.map(() => null),
        audioSubido: null,
        estado: "pendiente",
        intentos: 0,
        recargasArchivos: 0,
        proximoIntento: 0,
        error: null,
      };
      if (!existente && !e.reportes.some((r) => r.id === id))
        e.envios.push(pendiente);
      if (e.borrador?.id === id) e.borrador = null;
    });
    return (
      this.almacenamiento.leer(usuarioId).reportes.find((r) => r.id === id) ??
      reportePendiente(pendiente, usuarioId)
    );
  }

  corregir(usuarioId: string, id: string, reemplazarBorrador = false) {
    this.cambiar(usuarioId, (e) => {
      const envio = e.envios.find((x) => x.id === id);
      if (!envio || envio.estado !== "error")
        throw new Error("Sólo se pueden corregir los envíos rechazados.");
      const borrador = e.borrador;
      if (borrador && borrador.id !== id) {
        const conContenido =
          borrador.tipoId ||
          borrador.descripcion ||
          borrador.fotos.length ||
          borrador.audioUrl ||
          borrador.ubicacion;
        if (conContenido && !reemplazarBorrador)
          throw new Error(
            "Ya tenés otro borrador. Confirmá si querés reemplazarlo.",
          );
        e.limpieza.push(borrador.id);
      }
      e.borrador = {
        id: envio.id,
        creadoEn: envio.creadoEn,
        tipoId: envio.contenido.tipoId,
        descripcion: envio.contenido.descripcion ?? "",
        fotos: envio.contenido.fotos,
        audioUrl: envio.contenido.audioUrl,
        ubicacion: {
          latitude: envio.contenido.coordenadas.latitud,
          longitude: envio.contenido.coordenadas.longitud,
          direccion: envio.contenido.direccion,
        },
      };
      e.envios = e.envios.filter((x) => x.id !== id);
    });
  }

  reactivarSesion(usuarioId: string) {
    const e = this.almacenamiento.leer(usuarioId);
    if (!e.envios.some((x) => x.estado === "sesion")) return;
    for (const envio of e.envios)
      if (envio.estado === "sesion") {
        envio.estado = "pendiente";
        envio.proximoIntento = 0;
      }
    this.almacenamiento.guardar(usuarioId, e);
  }

  reintentar(usuarioId: string, id?: string) {
    this.cambiar(usuarioId, (e) => {
      for (const envio of e.envios) {
        if (!id || envio.id === id) {
          envio.proximoIntento = 0;
          if (envio.estado !== "enviando") envio.estado = "pendiente";
        }
      }
    });
  }

  sincronizar(usuarioId: string, transporte: TransporteCola): Promise<void> {
    const previo = this.trabajos.get(usuarioId);
    if (previo) return previo;
    const trabajo = this.procesar(usuarioId, transporte).finally(() =>
      this.trabajos.delete(usuarioId),
    );
    this.trabajos.set(usuarioId, trabajo);
    return trabajo;
  }

  private actualizar(
    usuarioId: string,
    id: string,
    cambio: (e: EnvioLocal) => void,
  ) {
    this.cambiar(usuarioId, (e) => {
      const envio = e.envios.find((x) => x.id === id);
      if (envio) cambio(envio);
    });
  }

  private confirmar(usuarioId: string, envio: EnvioLocal, reporte: Reporte) {
    if (
      reporte.id !== envio.id ||
      reporte.autorId !== usuarioId ||
      !reporte.sincronizado ||
      !reporte.codigo
    ) {
      throw new Error(
        "El servidor devolvió una confirmación inesperada. Conservamos tu reporte.",
      );
    }
    this.cambiar(usuarioId, (e) => {
      e.reportes = [reporte, ...e.reportes.filter((r) => r.id !== reporte.id)];
      e.envios = e.envios.filter((x) => x.id !== envio.id);
      e.limpieza.push(envio.id);
    });
  }

  private async procesar(usuarioId: string, t: TransporteCola) {
    // Un cierre abrupto deja "enviando" persistido; no implica que el servidor haya fallado.
    const envios = this.almacenamiento
      .leer(usuarioId)
      .envios.filter(
        (e) =>
          e.estado !== "error" &&
          e.estado !== "sesion" &&
          e.proximoIntento <= this.ahora(),
      );
    for (const original of envios) {
      if (!(await t.vigente())) return;
      this.actualizar(usuarioId, original.id, (e) => {
        e.estado = "enviando";
      });
      try {
        // Recuperar una respuesta perdida antes de volver a subir multimedia.
        const remoto = await t.buscar(original.id);
        if (remoto) {
          this.confirmar(usuarioId, original, remoto);
          continue;
        }
        for (let i = 0; i < original.contenido.fotos.length; i++) {
          const actual = this.almacenamiento
            .leer(usuarioId)
            .envios.find((e) => e.id === original.id)!;
          if (actual.fotosSubidas[i]) continue;
          if (!(await t.vigente())) return;
          const url = await t.subir(actual.contenido.fotos[i]);
          this.actualizar(usuarioId, original.id, (e) => {
            e.fotosSubidas[i] = { id: `fot-${original.id.slice(4)}-${i}`, url };
          });
        }
        let actual = this.almacenamiento
          .leer(usuarioId)
          .envios.find((e) => e.id === original.id)!;
        if (actual.contenido.audioUrl && !actual.audioSubido) {
          if (!(await t.vigente())) return;
          const url = await t.subir(actual.contenido.audioUrl);
          this.actualizar(usuarioId, original.id, (e) => {
            e.audioSubido = url;
          });
        }
        if (!(await t.vigente())) return;
        actual = this.almacenamiento
          .leer(usuarioId)
          .envios.find((e) => e.id === original.id)!;
        const reporte = await t.crear({
          id: actual.id,
          creadoEn: actual.creadoEn,
          tipoId: actual.contenido.tipoId,
          descripcion: actual.contenido.descripcion,
          direccion: actual.contenido.direccion,
          coordenadas: actual.contenido.coordenadas,
          fotos: actual.fotosSubidas,
          audioUrl: actual.audioSubido,
        });
        this.confirmar(usuarioId, actual, reporte);
      } catch (error) {
        const status = (error as { status?: number })?.status;
        this.actualizar(usuarioId, original.id, (e) => {
          e.intentos++;
          const recargarArchivos =
            (error as { code?: string })?.code === "ARCHIVO_NO_SUBIDO" &&
            (e.recargasArchivos ?? 0) < 1;
          if (recargarArchivos) {
            e.fotosSubidas = e.contenido.fotos.map(() => null);
            e.audioSubido = null;
            e.recargasArchivos = (e.recargasArchivos ?? 0) + 1;
          }
          e.estado = recargarArchivos
            ? "pendiente"
            : status === 401 || status === 403
              ? "sesion"
              : esReintentable(error)
                ? "pendiente"
                : "error";
          e.error =
            error instanceof Error
              ? error.message
              : "No pudimos enviar el reporte.";
          e.proximoIntento =
            this.ahora() +
            Math.min(300_000, 5000 * 2 ** Math.min(e.intentos - 1, 6));
        });
        if (status === 401 || status === 403) break;
      }
    }
    // Confirmación y limpieza son pasos separados: un fallo de disco nunca reenvía el reporte.
    for (const id of this.almacenamiento.leer(usuarioId).limpieza) {
      try {
        t.limpiar(id);
        this.cambiar(usuarioId, (e) => {
          e.limpieza = e.limpieza.filter((x) => x !== id);
        });
      } catch {
        /* Conservar la tarea para el próximo intento. */
      }
    }
  }
}
