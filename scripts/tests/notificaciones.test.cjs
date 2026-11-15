const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');

function preparar({ permiso = true, plataforma = 'android', fallo, request } = {}) {
  const eventos = [];
  const almacen = new Map();
  class ApiError extends Error { constructor(status) { super('API'); this.status = status; } }
  const dependencias = {
    'expo-constants': { __esModule: true, default: { executionEnvironment: 'bare', easConfig: { projectId: 'proyecto' } } },
    'react-native': { Platform: { OS: plataforma } },
    'expo-secure-store': {
      getItemAsync: async (k) => almacen.get(k) ?? null,
      setItemAsync: async (k, v) => almacen.set(k, v),
      deleteItemAsync: async (k) => almacen.delete(k),
    },
    './sesion': { obtenerToken: async () => 'sesion' },
    './http': { ApiError, request: async (ruta, opciones) => {
      eventos.push([opciones.method, ruta]);
      if (request) return request(ruta, opciones);
      if (fallo) throw new ApiError(fallo);
      return {};
    } },
    'expo-notifications': {
      AndroidImportance: { HIGH: 4 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
      setNotificationChannelAsync: async () => eventos.push(['canal']),
      getPermissionsAsync: async () => ({ granted: permiso, canAskAgain: true }),
      requestPermissionsAsync: async () => { eventos.push(['permiso']); return { granted: permiso }; },
      getExpoPushTokenAsync: async () => ({ data: 'ExpoPushToken[prueba]' }),
    },
  };
  const exports = {};
  const codigo = ts.transpileModule(fs.readFileSync('src/servicios/notificaciones.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(codigo, { exports, process: { env: { EXPO_PUBLIC_API_URL: "https://api.test" } }, require: (nombre) => {
    assert.ok(nombre in dependencias, nombre); return dependencias[nombre];
  } });
  return { api: exports, eventos, almacen };
}

test('registro automático no solicita permisos y no registra si están denegados', async () => {
  const { api, eventos } = preparar({ permiso: false });
  assert.equal(await api.registrarNotificaciones(), false);
  assert.deepEqual(eventos, [['canal']]);
});
test('permiso denegado explícitamente muestra error y no registra', async () => {
  const { api, eventos } = preparar({ permiso: false });
  await assert.rejects(api.registrarNotificaciones(true), /ajustes/);
  assert.deepEqual(eventos, [['canal'], ['permiso']]);
});
test('salir invalida un registro que todavía no empezó', async () => {
  const { api, eventos } = preparar();
  await Promise.all([api.registrarNotificaciones(), api.darDeBajaNotificaciones()]);
  await api.reintentarBajasNotificaciones();
  assert.equal(eventos.length, 0);
});
test('un fallo de red conserva la baja segura y permite salir', async () => {
  const { api, almacen } = preparar({ fallo: 503 });
  almacen.set('reporte-ciudadano-push', 'ExpoPushToken[prueba]');
  await api.darDeBajaNotificaciones();
  await api.reintentarBajasNotificaciones();
  assert.equal(almacen.has('reporte-ciudadano-push'), false);
  const bajas = JSON.parse(almacen.get('reporte-ciudadano-bajas-push'));
  assert.equal(bajas[0].token, 'sesion');
  assert.equal(bajas[0].servidor, 'https://api.test');
});
test('backend sin implementar permite salir y limpia los pendientes', async () => {
  const { api, almacen } = preparar({ fallo: 501 });
  almacen.set('reporte-ciudadano-push', 'ExpoPushToken[prueba]');
  await api.darDeBajaNotificaciones();
  await api.reintentarBajasNotificaciones();
  assert.equal(almacen.size, 0);
});
test('el cierre no espera un POST pendiente y después elimina su registro', async () => {
  let liberar;
  let empezo;
  const inicio = new Promise((resolve) => { empezo = resolve; });
  const { api, almacen, eventos } = preparar({ request: async (_ruta, opciones) => {
    assert.equal(opciones.timeoutMs, 4000);
    if (opciones.method === 'POST') {
      empezo();
      await new Promise((resolve) => { liberar = resolve; });
    }
    return {};
  } });
  const registro = api.registrarNotificaciones();
  await inicio;
  await api.darDeBajaNotificaciones();
  assert.equal(almacen.has('reporte-ciudadano-push'), false);
  assert.ok(almacen.has('reporte-ciudadano-bajas-push'));
  liberar();
  await registro;
  await api.reintentarBajasNotificaciones();
  assert.equal(almacen.size, 0);
  assert.deepEqual(eventos.map((e) => e[0]), ['canal', 'POST', 'DELETE']);
});
test('la baja fallida impide registrar el mismo dispositivo en otra cuenta', async () => {
  const { api, almacen, eventos } = preparar({ fallo: 503 });
  almacen.set('reporte-ciudadano-push', 'ExpoPushToken[prueba]');
  await api.darDeBajaNotificaciones();
  await assert.rejects(api.registrarNotificaciones(), /baja de avisos/);
  assert.equal(eventos.some((e) => e[0] === 'POST'), false);
});
test('web no carga módulos push ni registra un dispositivo', async () => {
  const { api, eventos } = preparar({ plataforma: 'web' });
  assert.equal(await api.registrarNotificaciones(), false);
  await api.darDeBajaNotificaciones();
  assert.equal(eventos.length, 0);
});
