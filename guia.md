# Guía de pruebas — Reporte Ciudadano (módulo de Juanchi)

Guía para principiantes en programación móvil. Te lleva desde cero hasta probar
el módulo del Vecino (crear reporte + cámara + galería + nota de voz).

> Rama de trabajo: `juanchicode`. Todo lo de abajo se corre desde la carpeta
> del proyecto: `F:\Documentos\www\Proyectos_Github\reporte-ciudadano-dm`.

---

## 1. Qué hay que instalar (una sola vez)

| Herramienta | Para qué | Cómo instalarla |
|---|---|---|
| Node.js 24 + npm 11 | Correr el proyecto (ya los tenés: `v24.20.0` / `11.19.1`) | https://nodejs.org (versión LTS) |
| Dependencias del proyecto | Expo SDK 57, React Native, cámara, audio, etc. | `npm install` (ver paso 3) |
| Expo Go (en tu celular) | Probar la app sin compilar nada | Play Store / App Store → buscar "Expo Go" |
| Opcional: Android Studio | Emulador Android en la PC | https://developer.android.com/studio |
| Opcional: EAS CLI | Generar el APK de entrega | `npm i -g eas-cli` (solo cuando toque el build) |

**Tu módulo ya tiene todo instalado** (`expo-camera`, `expo-image-picker`,
`expo-audio`, `expo-file-system` en versiones compatibles con SDK 57).
No instales nada más sin avisar al grupo: cada paquete de más puede romper
la compatibilidad del SDK.

---

## 2. Cómo revisar que todo esté instalado

Corré estos comandos en la terminal, dentro de la carpeta del proyecto:

```powershell
# 1. Herramientas base
node --version   # esperado: v24.x
npm --version    # esperado: 11.x
npx expo --version  # esperado: 57.x

# 2. Rama correcta
git branch --show-current  # esperado: juanchicode

# 3. Paquetes de tu módulo (los 4 tienen que aparecer)
npm list expo-camera expo-image-picker expo-audio expo-file-system --depth=0

# 4. El código compila (sin errores = OK)
npx tsc --noEmit

# 5. Linter (OK si solo falla el archivo pre-existente del template)
npm run lint
# Error conocido e ignorable: src/hooks/use-color-scheme.web.ts

# 6. Config válida (tiene que listar los plugins camera/image-picker/audio
#    y los permisos CAMERA + RECORD_AUDIO en Android)
npx expo config --type public
```

Si `npx tsc --noEmit` no muestra nada, está perfecto (silencio = sin errores).

---

## 3. Cómo correr el proyecto

```powershell
npm install      # solo la primera vez o si cambió package.json
npx expo start   # abre el menú de Expo con un QR
```

Opciones dentro del menú de Expo:

| Tecla | Qué hace | Cuándo usarla |
|---|---|---|
| Escanear QR con Expo Go | Abre la app en tu celular físico | **Recomendado** para cámara y micrófono |
| `a` | Abre emulador Android | Si no tenés celular a mano (cámara/mic fallan o mienten) |
| `w` | Abre en el navegador | Solo para ver pantallas, sin cámara ni micrófono |
| `r` | Recarga la app | Cuando cambiaste código y no se actualizó |
| `m` | Abre el menú de desarrollo | Para recargar, inspeccionar, etc. |

Una vez abierta la app: pestaña **Reportar** (o botón **"Crear reporte"** en Home).

---

## 4. Cómo probar tu módulo (checklist)

1. **Tipos de problema:** elegí uno (Bache, Luminaria, etc.). Se pinta con su color.
   Sin tipo elegido, el botón ENVIAR sigue deshabilitado (es lo esperado).
2. **Foto obligatoria:**
   - `Tomar foto` → abre la cámara → `Sacar foto` → aparece el preview.
     En emulador puede salir negro o fallar: es normal, se valida en físico.
   - `Galería` → elegí una imagen → aparece el preview.
   - Agregá una segunda foto (tope: 2 de 2, los botones se apagan).
   - Tocá la **X** de un preview: la foto desaparece (el archivo también se borra).
3. **Descripción (opcional):** escribí algo. Se puede dejar vacío.
4. **Nota de voz (opcional):**
   - `Grabar nota` → aceptá el micrófono → el cronómetro corre → `Parar`.
   - `Escuchar` / `Pausar` (muestra tiempos) → `Eliminar` para borrarla.
5. **ENVIAR:** se habilita solo con tipo + al menos 1 foto.
   Al enviar aparece **"¡Listo!"** con el código `GCHU-2026-XXXXX`.
   `Crear otro reporte` reinicia el formulario.
6. **Los archivos quedan guardados** en `document/reportes/borrador-<timestamp>/`
   (carpeta persistente del teléfono, sobrevive reinicios; no es la cache temporal).

---

## 5. Cómo probar los permisos (en celular físico, obligatorio pre-defensa)

La cátedra pregunta esto. Probalo con cada permiso (cámara y micrófono):

| Caso | Qué hacer | Qué tiene que pasar |
|---|---|---|
| Aceptar | Aceptar el permiso | El flujo sigue normal |
| Denegar 1 vez | Denegar | Aparece un cartel con **"Reintentar"** |
| Bloquear | Denegar 2 veces / "no volver a preguntar" (Android) | Aparece un cartel con **"Abrir ajustes"** → lleva a configuración → activás → volvés → funciona |

Dato útil: negar la **cámara** no bloquea la **galería**. El vecino igual puede
adjuntar una foto previa.

---

## 6. Si algo falla (errores comunes)

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Cannot determine the project's Expo SDK version` | Falta `npm install` | Corré `npm install` y reintentá |
| La cámara sale negra / no anda | Estás en emulador o web | Probá en celular físico con Expo Go |
| El micrófono no graba | Permiso denegado o emulador | Revisá el cartel de permiso / probá en físico |
| `npx expo install --check` pide actualizar varios paquetes | Subas menores del SDK | **No actualices** sin coordinar con el grupo; tu módulo anda con las actuales |
| Cambié código y no se refleja | Metro cacheó | Presioná `r` en la terminal de Expo, o reiniciá con `npx expo start -c` |
| `git status` muestra `datos tpi 2026/` | Esa carpeta es personal | Ya está en `.gitignore`; no la commitees |

---

## 7. Tips de móvil para principiantes (los que más te van a servir)

1. **Permisos:** en el celular el usuario manda. Tu app siempre tiene que
   funcionar aunque diga que no: explicar con buenos modos + ofrecer reintentar
   o abrir ajustes (eso hace `src/utils/permisos.ts`).
2. **Emulador ≠ teléfono:** cámara, micrófono, GPS y red se comportan distinto.
   Todo lo importante validalo en físico antes de la defensa.
3. **Cache vs persistente:** la foto recién sacada y el audio recién grabado
   viven en una carpeta **temporal** que el sistema puede borrar. Por eso tu
   módulo los copia a `document/reportes/...` con `guardarFoto()`/`guardarAudio()`.
4. **La cámara se desmonta:** solo puede haber un preview de cámara activo.
   Por eso `CamaraReporte` vive en un Modal que se cierra al sacar la foto.
5. **Audio tiene dos modos:** grabar (`allowsRecording: true`) y escuchar
   (`false`). Si no cambiás el modo, el parlante puede no sonar. Ya está
   manejado en `nota-de-voz.tsx`, pero acordate para la defensa.
6. **Botones grandes:** buena parte de los vecinos tiene +60 años (lo dice el
   PRD). Botones de al menos 48px de alto, letra legible, y la nota de voz como
   alternativa a escribir.
7. **Servicios async desde el día 1:** tus funciones `listarTiposDeReporte()` y
   `crearReporte()` ya son `async` aunque hoy devuelvan mocks. Cuando llegue la
   API real o SQLite, las pantallas no cambian.
8. **Nunca `Date.now()` dentro del render:** con `reactCompiler` da error de
   pureza. Por eso `DIRECTORIO_BORRADOR` está fuera del componente.

---

## 8. Comandos resumen (copiar/pegar)

```powershell
cd F:\Documentos\www\Proyectos_Github\reporte-ciudadano-dm
npm install
npx tsc --noEmit
npm run lint
npx expo start
```
