const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const { DatabaseSync } = require("node:sqlite");
const test = require("node:test");
const ts = require("typescript");

function cargar(archivo, dependencias = {}, globales = {}) {
  const exports = {};
  const codigo = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../..", archivo), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(codigo, {
    exports,
    Error,
    Date,
    process: { env: { EXPO_PUBLIC_API_URL: "https://api.test" } },
    Headers,
    FormData,
    AbortController,
    Response,
    ...globales,
    setTimeout,
    clearTimeout,
    require: (nombre) => {
      assert.ok(nombre in dependencias, nombre);
      return dependencias[nombre];
    },
  });
  return exports;
}
const { MotorCola, estadoVacio } = cargar("src/servicios/offline/motor.ts");
const clon = (v) => JSON.parse(JSON.stringify(v));
const contenido = {
  tipoId: "tip-bache",
  descripcion: "Pozo",
  fotos: ["file:///foto1.jpg", "file:///foto2.jpg"],
  audioUrl: "file:///audio.m4a",
  coordenadas: { latitud: -33, longitud: -58 },
  direccion: "Urquiza 1200",
};
const fecha = "2026-11-14T10:00:00-03:00";
function preparar() {
  const disco = new Map();
  let ahora = 0;
  const storage = {
    leer: (u) => clon(disco.get(u) ?? estadoVacio()),
    guardar: (u, e) => disco.set(u, clon(e)),
  };
  const motor = new MotorCola(storage, () => ahora);
  const remoto = new Map();
  const eventos = [];
  const transporte = {
    vigente: async () => true,
    buscar: async (id) => {
      eventos.push(["buscar", id]);
      return remoto.get(id) ?? null;
    },
    subir: async (uri) => {
      eventos.push(["subir", uri]);
      return `https://api.test/${uri.split("/").pop()}`;
    },
    crear: async (payload) => {
      eventos.push(["crear", clon(payload)]);
      const reporte = {
        ...payload,
        autorId: "usr-uno",
        codigo: "GCHU-2026-00001",
        sincronizado: true,
      };
      remoto.set(payload.id, reporte);
      return reporte;
    },
    limpiar: (id) => eventos.push(["limpiar", id]),
  };
  const encolar = (id = "rep-uno", user = "usr-uno") =>
    motor.encolar(user, id, fecha, clon(contenido));
  return {
    motor,
    storage,
    transporte,
    remoto,
    eventos,
    encolar,
    avanzar: (ms = 1e6) => {
      ahora += ms;
    },
  };
}

test("guarda antes de enviar y mantiene un id único ante doble pulsación", () => {
  const p = preparar();
  assert.equal(p.encolar().sincronizado, false);
  p.encolar();
  assert.equal(p.storage.leer("usr-uno").envios.length, 1);
  assert.equal(p.eventos.length, 0);
});

test("sin red conserva contenido, fotos y audio y programa backoff persistente", async () => {
  const p = preparar();
  p.encolar();
  p.transporte.buscar = async () => {
    throw new TypeError("sin red");
  };
  await p.motor.sincronizar("usr-uno", p.transporte);
  let e = p.storage.leer("usr-uno").envios[0];
  assert.equal(e.estado, "pendiente");
  assert.equal(e.proximoIntento, 5000);
  assert.deepEqual(e.contenido, contenido);
  await p.motor.sincronizar("usr-uno", p.transporte);
  assert.equal(p.storage.leer("usr-uno").envios[0].intentos, 1);
  p.avanzar(5000);
  await p.motor.sincronizar("usr-uno", p.transporte);
  e = p.storage.leer("usr-uno").envios[0];
  assert.equal(e.intentos, 2);
  assert.equal(e.proximoIntento, 15000);
  assert.ok(!p.eventos.some(([tipo]) => tipo === "limpiar"));
});

test("reanuda fotos ya confirmadas después de reiniciar el motor", async () => {
  const p = preparar();
  p.encolar();
  const subir = p.transporte.subir;
  p.transporte.subir = async (uri) => {
    if (uri.includes("foto2")) throw new Error("corte");
    return subir(uri);
  };
  await p.motor.sincronizar("usr-uno", p.transporte);
  assert.ok(p.storage.leer("usr-uno").envios[0].fotosSubidas[0]);
  assert.equal(p.storage.leer("usr-uno").envios[0].fotosSubidas[1], null);
  p.transporte.subir = subir;
  p.avanzar();
  const reiniciado = new MotorCola(p.storage, () => 1e6);
  await reiniciado.sincronizar("usr-uno", p.transporte);
  assert.equal(
    p.eventos.filter(([tipo, uri]) => tipo === "subir" && uri.includes("foto1"))
      .length,
    1,
  );
  assert.equal(p.storage.leer("usr-uno").envios.length, 0);
  const payload = p.eventos.find(([t]) => t === "crear")[1];
  assert.equal(payload.id, "rep-uno");
  assert.equal(payload.creadoEn, fecha);
  assert.equal(payload.descripcion, "Pozo");
  assert.equal(payload.fotos.length, 2);
  assert.equal(payload.audioUrl, "https://api.test/audio.m4a");
  assert.equal(p.eventos.at(-1)[0], "limpiar");
});

test("una respuesta de creación perdida se recupera por id sin subir de nuevo", async () => {
  const p = preparar();
  p.encolar();
  const crear = p.transporte.crear;
  p.transporte.crear = async (payload) => {
    await crear(payload);
    throw new Error("respuesta perdida");
  };
  await p.motor.sincronizar("usr-uno", p.transporte);
  assert.equal(p.storage.leer("usr-uno").envios.length, 1);
  assert.ok(!p.eventos.some(([t]) => t === "limpiar"));
  p.avanzar();
  await new MotorCola(p.storage, () => 1e6).sincronizar(
    "usr-uno",
    p.transporte,
  );
  assert.equal(p.remoto.size, 1);
  assert.equal(p.eventos.filter(([t]) => t === "crear").length, 1);
  assert.equal(p.eventos.filter(([t]) => t === "subir").length, 3);
  assert.equal(p.storage.leer("usr-uno").reportes[0].codigo, "GCHU-2026-00001");
});

test("dos disparadores concurrentes no ejecutan dos envíos", async () => {
  const p = preparar();
  p.encolar();
  await Promise.all([
    p.motor.sincronizar("usr-uno", p.transporte),
    p.motor.sincronizar("usr-uno", p.transporte),
  ]);
  assert.equal(p.eventos.filter(([t]) => t === "crear").length, 1);
});

test("no mezcla usuarios ni sigue subiendo al cambiar de cuenta", async () => {
  const p = preparar();
  p.encolar();
  p.encolar("rep-dos", "usr-dos");
  let activa = true;
  p.transporte.vigente = async () => activa;
  const subir = p.transporte.subir;
  p.transporte.subir = async (uri) => {
    const url = await subir(uri);
    activa = false;
    return url;
  };
  await p.motor.sincronizar("usr-uno", p.transporte);
  assert.equal(p.eventos.filter(([t]) => t === "subir").length, 1);
  assert.equal(p.eventos.filter(([t]) => t === "crear").length, 0);
  assert.equal(p.storage.leer("usr-dos").envios[0].estado, "pendiente");
  assert.equal(p.storage.leer("usr-dos").envios[0].fotosSubidas[0], null);
});

for (const status of [400, 401, 403, 422, 429, 503]) {
  test(`clasifica HTTP ${status} sin perder archivos ni reintentar errores permanentes`, async () => {
    const p = preparar();
    p.encolar();
    p.transporte.crear = async () => {
      const e = new Error("falló");
      e.status = status;
      throw e;
    };
    await p.motor.sincronizar("usr-uno", p.transporte);
    const e = p.storage.leer("usr-uno").envios[0];
    assert.equal(
      e.estado,
      [401, 403].includes(status)
        ? "sesion"
        : status >= 500 || status === 429
          ? "pendiente"
          : "error",
    );
    assert.equal(e.contenido.fotos.length, 2);
    assert.ok(!p.eventos.some(([t]) => t === "limpiar"));
    p.avanzar();
    await p.motor.sincronizar("usr-uno", p.transporte);
    assert.equal(
      p.storage.leer("usr-uno").envios[0].intentos,
      status === 429 || status >= 500 ? 2 : 1,
    );
  });
}

test("un 401 se puede reactivar luego de validar otra vez la misma cuenta", async () => {
  const p = preparar();
  p.encolar();
  p.transporte.buscar = async () => {
    const e = new Error("sesión vencida");
    e.status = 401;
    throw e;
  };
  await p.motor.sincronizar("usr-uno", p.transporte);
  p.motor.reactivarSesion("usr-uno");
  assert.equal(p.storage.leer("usr-uno").envios[0].estado, "pendiente");
});

test("un fallo de limpieza no provoca reenvío y se reintenta al reiniciar", async () => {
  const p = preparar();
  p.encolar();
  p.transporte.limpiar = () => {
    throw new Error("archivo ocupado");
  };
  await p.motor.sincronizar("usr-uno", p.transporte);
  assert.equal(p.storage.leer("usr-uno").envios.length, 0);
  assert.deepEqual(p.storage.leer("usr-uno").limpieza, ["rep-uno"]);
  p.transporte.limpiar = () => {};
  await new MotorCola(p.storage).sincronizar("usr-uno", p.transporte);
  assert.equal(p.storage.leer("usr-uno").limpieza.length, 0);
  assert.equal(p.eventos.filter(([t]) => t === "crear").length, 1);
});

test("no limpia archivos si falla la escritura de la confirmación en disco", async () => {
  const p = preparar();
  p.encolar();
  const guardar = p.storage.guardar;
  p.storage.guardar = (u, e) => {
    if (e.reportes.length) throw new Error("disco lleno");
    guardar(u, e);
  };
  await p.motor.sincronizar("usr-uno", p.transporte);
  assert.equal(p.storage.leer("usr-uno").envios.length, 1);
  assert.equal(p.remoto.size, 1);
  assert.ok(!p.eventos.some(([t]) => t === "limpiar"));
});

test("no acepta confirmaciones para otro autor", async () => {
  const p = preparar();
  p.encolar();
  p.transporte.buscar = async () => ({
    id: "rep-uno",
    codigo: "código",
    sincronizado: true,
    autorId: "usr-otro",
  });
  await p.motor.sincronizar("usr-uno", p.transporte);
  assert.equal(p.storage.leer("usr-uno").envios.length, 1);
  assert.equal(p.storage.leer("usr-uno").reportes.length, 0);
});

test("SQLite real conserva borrador y cola tras cerrar y reabrir la base", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reportes-offline-"));
  const conexiones = [];
  const abrir = () =>
    cargar("src/servicios/offline/persistencia.ts", {
      "./motor": { estadoVacio },
      "expo-sqlite": {
        openDatabaseSync: () => {
          const db = new DatabaseSync(path.join(dir, "local.db"));
          conexiones.push(db);
          return {
            execSync: (q) => db.exec(q),
            getFirstSync: (q, ...args) => db.prepare(q).get(...args),
            runSync: (q, ...args) => db.prepare(q).run(...args),
          };
        },
      },
    });
  try {
    let api = abrir();
    const id = api.nuevoIdLocal();
    assert.match(id, /^rep-[a-f0-9]{32}$/);
    const m = new MotorCola(api.persistencia);
    m.guardarBorrador("usr-uno", {
      id,
      creadoEn: fecha,
      tipoId: null,
      fotos: ["file:///persistente.jpg"],
      descripcion: "sin terminar",
      audioUrl: null,
      ubicacion: null,
    });
    m.encolar("usr-uno", "rep-enviado", fecha, contenido);
    conexiones.pop().close();
    api = abrir();
    assert.equal(
      api.persistencia.leer("usr-uno").borrador.descripcion,
      "sin terminar",
    );
    assert.equal(api.persistencia.leer("usr-uno").envios[0].id, "rep-enviado");
    assert.equal(api.persistencia.leer("usr-dos").envios.length, 0);
  } finally {
    conexiones.forEach((c) => c.close());
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("el catálogo inicial está disponible desde la primera apertura sin red", async () => {
  let remoto = null;
  const api = cargar("src/servicios/offline/catalogo.ts", {
    "./persistencia": {
      leerLocal: () => remoto,
      guardarLocal: (_k, valor) => {
        remoto = valor;
      },
    },
    "../http": {
      request: async () => {
        throw new Error("sin red");
      },
    },
  });
  assert.equal(api.tiposGuardados().length, 8);
  assert.equal(api.tiposGuardados()[0].id, "tip-bache");
  await assert.rejects(api.actualizarTipos());
  assert.equal(api.tiposGuardados().length, 8);
});

test("el catálogo actualizado se conserva y reemplaza al inicial incluso si está vacío", async () => {
  let remoto = null;
  const api = cargar("src/servicios/offline/catalogo.ts", {
    "./persistencia": {
      leerLocal: () => remoto,
      guardarLocal: (_k, valor) => {
        remoto = valor;
      },
    },
    "../http": { request: async () => [] },
  });
  await api.actualizarTipos();
  assert.equal(api.tiposGuardados().length, 0);
});

function restauracion({
  conectado = false,
  cache = { id: "usr-uno", rol: "vecino" },
  biometria = false,
  codigo = "SIN_CONEXION",
} = {}) {
  let borrado = false;
  const api = cargar("src/servicios/restauracion-sesion.ts", {
    "./auth": {
      validarToken: async () =>
        conectado ? { datos: cache } : { error: { codigo, mensaje: "Error" } },
    },
    "./sesion": {
      obtenerToken: async () => "sesion",
      obtenerUsuarioGuardado: async () => cache,
      borrarToken: async () => {
        borrado = true;
      },
      guardarUsuarioSesion: async () => {},
    },
    "./preferencias": { obtenerPreferenciaBiometria: async () => biometria },
    "../tipos/api": { esError: (v) => "error" in v },
  });
  return { cargar: api.cargarSesionGuardada, borrado: () => borrado };
}

test("reiniciar sin red permite restaurar al vecino previamente autenticado", async () => {
  const sesion = await restauracion().cargar();
  assert.equal(sesion.fase, "autenticado");
  assert.equal(sesion.modoOffline, true);
  assert.equal(sesion.usuario.id, "usr-uno");
});
test("restaurar sin red respeta el bloqueo biométrico", async () => {
  assert.equal(
    (await restauracion({ biometria: true }).cargar()).fase,
    "bloqueado",
  );
});
test("sin perfil previo o con perfil de operador no habilita acceso offline", async () => {
  for (const cache of [null, { id: "usr-op", rol: "operador" }]) {
    const sesion = await restauracion({ cache }).cargar();
    assert.equal(sesion.fase, "sin_conexion");
    assert.equal(sesion.usuario, null);
  }
});
test("un token rechazado por el servidor no habilita acceso usando el perfil guardado", async () => {
  const r = restauracion({ codigo: "NO_AUTENTICADO" });
  const sesion = await r.cargar();
  assert.equal(sesion.fase, "anonimo");
  assert.equal(r.borrado(), true);
});
test("un rechazo de permisos no se interpreta como una caída de red", async () => {
  assert.equal(
    (await restauracion({ codigo: "PROHIBIDO" }).cargar()).fase,
    "sin_conexion",
  );
});
test("una sesión validada online no se marca como offline", async () => {
  const sesion = await restauracion({ conectado: true }).cargar();
  assert.equal(sesion.fase, "autenticado");
  assert.equal(sesion.modoOffline, false);
});

test("el perfil local sólo se recupera con el mismo token y se borra al salir", async () => {
  const datos = new Map();
  const api = cargar("src/servicios/sesion.ts", {
    "react-native": { Platform: { OS: "android" } },
    "expo-secure-store": {
      getItemAsync: async (k) => datos.get(k) ?? null,
      setItemAsync: async (k, v) => datos.set(k, v),
      deleteItemAsync: async (k) => datos.delete(k),
    },
  });
  await api.guardarToken("token-uno");
  await api.guardarUsuarioSesion({ id: "usr-uno" }, "token-uno");
  assert.equal((await api.obtenerUsuarioGuardado()).id, "usr-uno");
  await api.guardarToken("token-dos");
  assert.equal(await api.obtenerUsuarioGuardado(), null);
  await assert.rejects(
    api.guardarUsuarioSesion({ id: "usr-uno" }, "token-uno"),
  );
  await api.guardarUsuarioSesion({ id: "usr-dos" }, "token-dos");
  await api.borrarToken();
  assert.equal(datos.size, 0);
});

test("un timeout de red termina el pedido y permite reintentar", async () => {
  const { request } = cargar(
    "src/servicios/http.ts",
    {},
    {
      fetch: async (_url, { signal }) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener("abort", () => reject(new Error("timeout"))),
        ),
    },
  );
  await assert.rejects(
    request("/yo", { timeoutMs: 5 }),
    (e) => e.code === "SIN_CONEXION" && e.status === 0,
  );
});

test("una respuesta 200 truncada se considera transitoria, un 204 sigue funcionando", async () => {
  let response = new Response("no es JSON", { status: 200 });
  const { request } = cargar(
    "src/servicios/http.ts",
    {},
    { fetch: async () => response },
  );
  await assert.rejects(request("/reportes"), (e) => e.status === 502);
  response = new Response(null, { status: 204 });
  assert.equal(
    await request("/dispositivos/token", { method: "DELETE" }),
    null,
  );
});

test("el transporte conserva auth, cuerpo y errores de contrato al añadir timeout", async () => {
  let init;
  const { request } = cargar(
    "src/servicios/http.ts",
    {},
    {
      fetch: async (_url, opciones) => {
        init = opciones;
        return new Response(
          JSON.stringify({
            error: {
              codigo: "TIPO_NO_ENCONTRADO",
              mensaje: "Tipo inexistente",
            },
          }),
          { status: 404 },
        );
      },
    },
  );
  await assert.rejects(
    request("/reportes", { method: "POST", token: "sesion", body: "{}" }),
    (e) => e.code === "TIPO_NO_ENCONTRADO" && e.status === 404,
  );
  assert.equal(init.headers.get("Authorization"), "Bearer sesion");
  assert.equal(init.body, "{}");
  assert.equal(init.token, undefined);
  assert.equal(init.timeoutMs, undefined);
});

test("los callbacks tardíos no pueden convertir un envío en otro borrador editable", () => {
  const p = preparar();
  p.encolar();
  assert.throws(
    () => p.motor.guardarBorrador("usr-uno", { id: "rep-uno" }),
    /ya se guardó/,
  );
  assert.equal(p.storage.leer("usr-uno").borrador, null);
});

test("corregir un rechazo conserva el id y los archivos, y protege otro borrador", async () => {
  const p = preparar();
  p.encolar();
  p.transporte.buscar = async () => {
    const e = new Error("Tipo inexistente");
    e.status = 400;
    throw e;
  };
  await p.motor.sincronizar("usr-uno", p.transporte);
  p.motor.guardarBorrador("usr-uno", {
    id: "rep-otro",
    descripcion: "no perder",
    fotos: [],
    tipoId: null,
    audioUrl: null,
    ubicacion: null,
  });
  assert.throws(() => p.motor.corregir("usr-uno", "rep-uno"), /otro borrador/);
  assert.equal(p.storage.leer("usr-uno").envios.length, 1);
  p.motor.corregir("usr-uno", "rep-uno", true);
  const e = p.storage.leer("usr-uno");
  assert.equal(e.borrador.id, "rep-uno");
  assert.equal(e.borrador.creadoEn, fecha);
  assert.deepEqual(e.borrador.fotos, contenido.fotos);
  assert.equal(e.borrador.audioUrl, contenido.audioUrl);
  assert.equal(e.envios.length, 0);
  assert.deepEqual(e.limpieza, ["rep-otro"]);
});

test("recupera automáticamente archivos subidos que el servidor ya no conserva", async () => {
  const p = preparar();
  p.encolar();
  const crear = p.transporte.crear;
  let intentos = 0;
  p.transporte.crear = async (payload) => {
    if (++intentos === 1) {
      const e = new Error("Archivo no subido");
      e.status = 400;
      e.code = "ARCHIVO_NO_SUBIDO";
      throw e;
    }
    return crear(payload);
  };
  await p.motor.sincronizar("usr-uno", p.transporte);
  assert.equal(p.storage.leer("usr-uno").envios[0].estado, "pendiente");
  assert.ok(
    p.storage.leer("usr-uno").envios[0].fotosSubidas.every((x) => x === null),
  );
  p.avanzar();
  await p.motor.sincronizar("usr-uno", p.transporte);
  assert.equal(p.storage.leer("usr-uno").envios.length, 0);
  assert.equal(p.eventos.filter(([t]) => t === "subir").length, 6);
});

test("no repite indefinidamente uploads si el servidor rechaza sus URLs", async () => {
  const p = preparar();
  p.encolar();
  p.transporte.crear = async () => {
    const e = new Error("Archivo no subido");
    e.status = 400;
    e.code = "ARCHIVO_NO_SUBIDO";
    throw e;
  };
  await p.motor.sincronizar("usr-uno", p.transporte);
  p.avanzar();
  await p.motor.sincronizar("usr-uno", p.transporte);
  assert.equal(p.storage.leer("usr-uno").envios[0].estado, "error");
  p.avanzar();
  await p.motor.sincronizar("usr-uno", p.transporte);
  assert.equal(p.eventos.filter(([t]) => t === "subir").length, 6);
  assert.ok(!p.eventos.some(([t]) => t === "limpiar"));
});

test("reiniciar con un envío marcado en curso lo recupera sin intervención", async () => {
  const p = preparar();
  p.encolar();
  const estado = p.storage.leer("usr-uno");
  estado.envios[0].estado = "enviando";
  p.storage.guardar("usr-uno", estado);
  await new MotorCola(p.storage).sincronizar("usr-uno", p.transporte);
  assert.equal(p.storage.leer("usr-uno").envios.length, 0);
  assert.equal(p.remoto.size, 1);
});
