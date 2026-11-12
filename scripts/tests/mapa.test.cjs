const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Compilar en memoria permite probar lógica TS sin cargar módulos nativos de Expo.
function cargarTS(archivo, dependencias = {}) {
  const codigo = ts.transpileModule(
    fs.readFileSync(path.resolve(__dirname, "../..", archivo), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports,
    URLSearchParams,
    require: (nombre) => {
      assert.ok(nombre in dependencias, `Dependencia sin simular: ${nombre}`);
      return dependencias[nombre];
    },
  });
  return exports;
}

const geo = cargarTS("src/utils/ubicacion.ts");
const centro = geo.CENTRO_GUALEGUAYCHU;
const puntoAlNorte = (metros) => ({
  latitud: centro.latitud + (metros / 6_371_000) * (180 / Math.PI),
  longitud: centro.longitud,
});
const reporte = (id, metros, tipoId = "tip-bache", estado = "recibido") => ({
  id, tipoId, estado, coordenadas: puntoAlNorte(metros),
});
const ids = (reportes) => Array.from(reportes, (item) => item.id);

test("distancia: mismo punto, simetría y separación conocida", () => {
  assert.equal(geo.distanciaMetros(centro, centro), 0);
  const unGrado = geo.distanciaMetros({ latitud: 0, longitud: 0 }, { latitud: 1, longitud: 0 });
  assert.ok(Math.abs(unGrado - 111_194.93) < 0.01);
  assert.equal(geo.distanciaMetros(centro, puntoAlNorte(50)), geo.distanciaMetros(puntoAlNorte(50), centro));
});

test("distancia: puntos opuestos no producen NaN", () => {
  assert.ok(Number.isFinite(geo.distanciaMetros(
    { latitud: 0, longitud: 0 }, { latitud: 0, longitud: 180 },
  )));
});

test("zona municipal: centro y 14.999 m adentro; 15.001 m afuera", () => {
  assert.equal(geo.fueraDeZonaMunicipal(centro), false);
  assert.equal(geo.fueraDeZonaMunicipal(puntoAlNorte(14_999)), false);
  assert.equal(geo.fueraDeZonaMunicipal(puntoAlNorte(15_001)), true);
  assert.equal(geo.fueraDeZonaMunicipal({ latitud: -34.6037, longitud: -58.3816 }), true);
});

test("sin filtros devuelve todos los estados, incluidos los rechazados", () => {
  const datos = [reporte("a", 0), reporte("b", 1500, "tip-luminaria", "rechazado")];
  assert.deepEqual(ids(geo.filtrarReportesMapa(datos, null, null, null)), ["a", "b"]);
  assert.equal(datos.length, 2);
});

test("tipo, estado y cercanía se combinan", () => {
  const datos = [
    reporte("coincide", 20),
    reporte("otro-tipo", 20, "tip-luminaria"),
    reporte("otro-estado", 20, "tip-bache", "resuelto"),
    reporte("lejos", 1001),
  ];
  assert.deepEqual(ids(geo.filtrarReportesMapa(datos, "tip-bache", "recibido", centro)), ["coincide"]);
});

test("cercanía del mapa usa 1 km y no el radio de duplicados de 50 m", () => {
  const datos = [reporte("a-49", 49), reporte("a-51", 51), reporte("a-999", 999), reporte("a-1001", 1001)];
  assert.deepEqual(ids(geo.filtrarReportesMapa(datos, null, null, centro)), ["a-49", "a-51", "a-999"]);
});

test("un filtro sin coincidencias produce una lista vacía", () => {
  assert.deepEqual(ids(geo.filtrarReportesMapa([reporte("a", 0)], null, "rechazado", null)), []);
});

function servicio(request) {
  return cargarTS("src/servicios/reportes.ts", {
    "./http": { request },
    "./almacenamiento": {},
    "./sesion": {},
    "@/utils/ubicacion": geo,
  });
}

test("cercanos consulta el endpoint a 50 m, sin filtrar por tipo ni estado", async () => {
  let url;
  const api = servicio(async (ruta) => { url = new URL(ruta, "https://api.test"); return []; });
  assert.deepEqual(ids(await api.listarReportesCercanos(centro)), []);
  assert.equal(url.pathname, "/reportes/cercanos");
  assert.equal(url.searchParams.get("latitud"), String(centro.latitud));
  assert.equal(url.searchParams.get("longitud"), String(centro.longitud));
  assert.equal(url.searchParams.get("radioMetros"), "50");
  assert.equal(url.searchParams.has("tipoId"), false);
  assert.equal(url.searchParams.has("estado"), false);
});

test("cercanos recupera páginas adicionales cuando hay más de 100 resultados", async () => {
  const paginas = [];
  const api = servicio(async (ruta) => {
    const pagina = Number(new URL(ruta, "https://api.test").searchParams.get("pagina"));
    paginas.push(pagina);
    return pagina === 1 ? Array.from({ length: 100 }, (_, i) => ({ id: `rep-${i}` })) : [{ id: "ultimo" }];
  });
  const reportes = await api.listarReportesCercanos(centro);
  assert.equal(reportes.length, 101);
  assert.equal(reportes[100].id, "ultimo");
  assert.deepEqual(paginas, [1, 2]);
});

test("mapa pide todos los estados y recupera más de 500 reportes", async () => {
  const paginas = [];
  const api = servicio(async (ruta) => {
    const url = new URL(ruta, "https://api.test");
    assert.equal(url.pathname, "/reportes");
    assert.equal(url.searchParams.get("porPagina"), "500");
    assert.equal(url.searchParams.get("estado"), "recibido,en_revision,asignado,resuelto,rechazado");
    const pagina = Number(url.searchParams.get("pagina"));
    paginas.push(pagina);
    return pagina === 1 ? Array.from({ length: 500 }, (_, i) => ({ id: `rep-${i}` })) : [];
  });
  assert.equal((await api.listarReportesDelMapa()).length, 500);
  assert.deepEqual(paginas, [1, 2]);
});

test("un error de red se propaga: no aparenta que no hay duplicados", async () => {
  const api = servicio(async () => { throw new Error("Sin conexión"); });
  await assert.rejects(api.listarReportesCercanos(centro), /Sin conexión/);
  await assert.rejects(api.listarReportesDelMapa(), /Sin conexión/);
});
