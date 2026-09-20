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