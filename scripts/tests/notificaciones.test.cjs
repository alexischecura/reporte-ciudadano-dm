const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');

function preparar({ permiso = true, plataforma = 'android', fallo } = {}) {
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
  vm.runInNewContext(codigo, { exports, require: (nombre) => {
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
test('la baja espera al registro pendiente y elimina el token local', async () => {
  const { api, eventos, almacen } = preparar();
  await Promise.all([api.registrarNotificaciones(), api.darDeBajaNotificaciones()]);
  assert.deepEqual(eventos.map((e) => e[0]), ['canal', 'POST', 'DELETE']);
  assert.equal(almacen.size, 0);
  assert.match(eventos[2][1], /ExpoPushToken%5Bprueba%5D/);
});
test('un fallo de baja conserva el token para reintentar', async () => {
  const { api, almacen } = preparar({ fallo: 503 });
  almacen.set('reporte-ciudadano-push', 'ExpoPushToken[prueba]');
  await assert.rejects(api.darDeBajaNotificaciones());
  assert.equal(almacen.size, 1);
});
test('backend sin implementar permite salir y limpia el token', async () => {
  const { api, almacen } = preparar({ fallo: 501 });
  almacen.set('reporte-ciudadano-push', 'ExpoPushToken[prueba]');
  await api.darDeBajaNotificaciones();
  assert.equal(almacen.size, 0);
});
test('web no carga módulos push ni registra un dispositivo', async () => {
  const { api, eventos } = preparar({ plataforma: 'web' });
  assert.equal(await api.registrarNotificaciones(), false);
  await api.darDeBajaNotificaciones();
  assert.equal(eventos.length, 0);
});
