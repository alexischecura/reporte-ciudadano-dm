# Resumen — Revisión del módulo de Juanchi

Fecha: 16/09/2026 · TPI Reporte Ciudadano · Rama `juanchicode`

## Veredicto

La parte de Juanchi (Módulo del Vecino) está **completa** ✅ y bien hecha
para el nivel de quien recién empieza con programación móvil.

## Checklist contra el plan

| Ítem del plan | Estado |
|---|---|
| Pantalla de creación de reportes con selección rápida de tipo (8 tipos) | ✅ `src/app/reportar.tsx` |
| Cámara obligatoria (CameraView) + permisos amigables con acceso a ajustes | ✅ `src/components/reportes/camara-reporte.tsx` + `src/utils/permisos.ts` |
| Galería (image-picker) + segunda foto opcional | ✅ `src/components/reportes/seccion-foto.tsx` |
| Nota de voz (expo-audio) + archivos con la API nueva de expo-file-system (File, Directory, Paths) | ✅ `nota-de-voz.tsx` + `src/servicios/almacenamiento.ts` |
| Base común: tipos, mocks con "casos feos" y servicios async desde el día 1 | ✅ `src/tipos`, `src/mocks`, `src/servicios/reportes.ts` |

## Verificación técnica

- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → solo falla el archivo del template (`src/hooks/use-color-scheme.web.ts`), ya conocido e ignorable.
- Permisos de cámara, fotos y micrófono correctos en `app.json`.

Bien resueltos: código `GCHU-2026-XXXXX` al enviar, validación "sin foto no hay reporte" (PRD), archivos copiados de cache a persistente, y separación cámara/audio.

## Único pendiente

Probar permisos en celular físico antes de la defensa (checklist ya documentada en `guia.md`). Los TODOs que faltan (GPS real, SQLite/offline, login/navegación) son de Alexis y Alan.

## Mejoras opcionales (nivel principiante)

1. "Crear otro reporte" reusa la misma carpeta `borrador-...` → usar una carpeta nueva por formulario para no acumular archivos.
2. `abrirGaleria()` sin try/catch → agregar try/catch + Alert por si el picker falla.
3. Si el vecino sale de la pantalla con la nota grabando/escuchando → detener con un `useEffect` de limpieza.
4. Accesibilidad: label en botones y más área táctil en el botón ✕ de las fotos.

Ninguna es bloqueante. Está bien lo hecho hasta ahora.

---

## Actualización 02/10/2026 — Revisión de cambios del compañero + fixes

### 1. `crearReporte` unificado a `{ datos } / { error }` ✅

- `src/servicios/reportes.ts`: `crearReporte(borrador, usuarioId): Promise<RespuestaApi<Reporte>>`.
  Ya no tira `throw`; devuelve `{ error: { codigo: "FOTO_REQUERIDA", ... } }` o `{ datos: reporte }`,
  mismo formato que `src/servicios/auth.ts` (`login` / `registrar` / `validarToken`).
- No hay función helper de errores: se usa retorno discriminado inline + el type-guard
  `esError()` que ya existía en `src/tipos/api.ts`.
- `src/app/reportar.tsx` ya estaba adaptado al nuevo formato (sin `try/catch` para `crearReporte`).
- `autorId` sale del usuario logueado (`useSesion().usuario.id`), no más `usr-084` fijo.
- Agregado blindaje: si `usuarioId` viene vacío → `{ error: { codigo: "NO_AUTENTICADO",
  mensaje: "Tenés que iniciar sesión para crear un reporte." } }`, y la pantalla muestra
  ese mensaje en vez de un `return` silencioso.

### 2. Dark mode corregido 🌙

- `src/constants/theme.ts`: agregado color `error` (`light #8B1A1A` / `dark #FF8A8A`).
  El azul ya venía del theme (`light #208AEF` → `dark #4C9AFF`, más claro a propósito por contraste).
- `reportar.tsx`: textos de error con `<ThemedText themeColor="error">` (el `#8B1A1A` fijo era ilegible en dark).
- `seccion-foto.tsx`: "Tomar foto" y "✕" con `#fff` fijo (el `themeColor="background"` quedaba negro sobre azul en dark);
  placeholder del preview usa `colors.backgroundSelected`.
- `nota-de-voz.tsx`: stop/eliminar usan `colors.error` / `themeColor="error"` (el `#C1440E` fijo tenía poco contraste en dark).
- `camara-reporte.tsx`: fondo negro fijo intencional, no se toca (las cámaras fullscreen siempre son oscuras).
- `themed-view.tsx`: `lightColor`/`darkColor` ahora sí se respetan (antes se ignoraban).
  `themed-text.tsx`: sacado el `#3c87f7` hardcodeado de `linkPrimary`.

### 3. Entorno: `expo-secure-store` faltante 🔧

- `npx expo start` fallaba con `PluginError: Failed to resolve plugin for module "expo-secure-store"`.
- Causa: declarado en `package.json` (`~57.0.4`) y en `app.json` (válido), pero la carpeta
  `node_modules/expo-secure-store` (y `expo-local-authentication`) no existía → `npm install` incompleto.
- Fix: `npm install` + verificado con `npx expo config --type public` (resuelve sin errores).

### Verificación actual

- `npx eslint` en los 7 archivos tocados → limpio.
- `npx tsc --noEmit` → solo 5 errores pre-existentes (`login`/`registro` por rutas del router,
  `biometria`/`sesion` por tipos de módulos expo), ninguno en lo tocado.