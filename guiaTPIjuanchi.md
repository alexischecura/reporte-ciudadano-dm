# Guía TPI — Juanchi: explicar tu código al profesor

> Rama: `juanchicode`. Esta guía explica, en lenguaje simple, todo lo que
> hiciste en el **Módulo del Vecino** (crear reporte + cámara + galería +
> nota de voz + permisos) para que puedas contarlo y defenderlo.

---

## 1. Qué te tocó a vos

El plan del grupo te asignó el **Módulo del Vecino**: la pantalla donde el
vecino crea un reporte. Tu módulo tiene que cumplir esto del PRD:

- Elegir el tipo de problema de una lista corta (bache, luminaria, etc.).
- **Sacar una foto es obligatorio. Sin foto no hay reporte.**
- Poder agregar una **segunda foto** si con una no se entiende.
- Describir escribiendo **o grabando una nota de voz** (mucha gente grande no escribe).
- Al terminar, mostrarle un **número de seguimiento** (`GCHU-2026-XXXXX`).

Lo que NO te tocó (es de tus compañeros, y el código lo marca con `TODO`):
GPS real y mapa (Alexis), SQLite y cola offline (Alexis), login y
navegación final (Alan), seguimiento y bandeja del operador (Frank).

---

## 2. Mapa de archivos: qué hace cada uno

| Archivo | Qué hace |
|---|---|
| `src/app/reportar.tsx` | La pantalla "Nuevo reporte": el formulario completo (tipo, fotos, descripción, audio, ENVIAR, pantalla de éxito). |
| `src/components/reportes/seccion-foto.tsx` | La sección de fotos: botones "Tomar foto" y "Galería", previews y botón ✕. Máximo 2 fotos. |
| `src/components/reportes/camara-reporte.tsx` | La cámara propia: abre el visor (`CameraView`), saca la foto y maneja el permiso. |
| `src/components/reportes/nota-de-voz.tsx` | Grabar, escuchar, pausar y eliminar la nota de voz (`.m4a`). |
| `src/utils/permisos.ts` | Utilidad de permisos: si deniegan → "Reintentar"; si bloquean → "Abrir ajustes". |
| `src/servicios/almacenamiento.ts` | Copia fotos y audio de la carpeta temporal a una carpeta **persistente** del teléfono. |
| `src/servicios/reportes.ts` | La "capa de servicios": `listarTiposDeReporte()` y `crearReporte()`. Hoy devuelven mocks, mañana la API real. |
| `src/tipos/borrador.ts` | El contrato de datos: qué lleva un reporte antes de crearse (`BorradorReporte`). |
| `src/tipos/reporte.ts`, `src/tipos/tipo-de-reporte.ts` | El contrato de `Reporte` y de `TipoDeReporte`. |
| `src/mocks/tipos-de-reporte.mock.ts` | Los 8 tipos de problema de mentira (hasta que llegue la API). |

---

## 3. Cómo funciona el flujo, paso a paso

1. **Abrís "Reportar".** La pantalla (`reportar.tsx`) carga los 8 tipos de
   problema con `listarTiposDeReporte()` y los muestra como chips de colores.
2. **Elegís el tipo.** Se guarda en una variable de estado (`tipoId`).
3. **Agregás la foto (obligatoria).**
   - "Tomar foto" abre la cámara propia en una ventana (`Modal`).
   - "Galería" deja elegir una foto ya sacada.
   - Máximo 2 fotos; la ✕ borra el preview **y el archivo**.
4. **Escribís la descripción (opcional)** o **grabás una nota de voz** (opcional).
5. **Apretás ENVIAR.** El botón solo se habilita si hay tipo elegido + al
   menos 1 foto. Se llama a `crearReporte()` y aparece el **"¡Listo!"** con
   el código `GCHU-2026-XXXXX`.
6. **"Crear otro reporte"** reinicia el formulario.

Detrás de escena: cada foto/audio se copia a una carpeta persistente del
teléfono (`document/reportes/borrador-<fecha>/`), que **sobrevive reinicios**.

---

## 4. Conceptos clave (para principiantes)

- **React Native + Expo:** escribís con JavaScript/TypeScript y Expo lo
  convierte en app de Android/iOS. No escribís código nativo.
- **Componente:** un pedazo de pantalla reutilizable (una función que devuelve
  interfaz). Ej.: `NotaDeVoz`, `SeccionFoto`, `CamaraReporte`.
- **Props:** los datos que le pasás a un componente desde su "padre".
  Ej.: `<NotaDeVoz audioUri={...} onCambiar={...} />` (nota-de-voz.tsx:31).
- **`useState`:** la "memoria" del componente. Cada vez que cambia, la pantalla
  se redibuja. Ej.: `const [fotos, setFotos] = useState<string[]>([])`.
- **`useEffect`:** código que corre una vez (o cuando algo cambia), por
  ejemplo cargar los tipos al abrir la pantalla (reportar.tsx:44-61).
- **`async/await`:** forma de escribir código que "espera" algo lento
  (pedir permiso, guardar un archivo) sin congelar la app.
- **Permisos:** en el celular el usuario manda. Tu código pide permiso
  (`pedir()`), y según la respuesta muestra: sigue / "Reintentar" /
  "Abrir ajustes" (permisos.ts:26-57).
- **`Modal`:** una ventana que tapa la pantalla. La cámara vive en un `Modal`
  porque solo puede haber **un** visor de cámara activo (camara-reporte.tsx:58).
- **Cache vs persistente:** la foto recién sacada y el audio recién grabado
  viven en una carpeta **temporal** que el sistema puede borrar. Por eso se
  copian a `document/reportes/...`, que es **persistente**
  (almacenamiento.ts:1-10).
- **La regla "sin foto no hay reporte":** viene del PRD y se cumple en dos
  lugares: el botón ENVIAR deshabilitado (reportar.tsx:63) y la validación
  `FOTO_REQUERIDA` en el servicio (reportes.ts:38-40).

---

## 5. Ejemplos con código real explicado

### 5.1. Los estados de la pantalla (`src/app/reportar.tsx:31-42`)

```ts
const [tipos, setTipos] = useState<TipoDeReporte[]>([]); // los 8 tipos
const [tipoId, setTipoId] = useState<string | null>(null); // tipo elegido
const [fotos, setFotos] = useState<string[]>([]);          // URIs de fotos
const [descripcion, setDescripcion] = useState("");        // texto
const [audioUri, setAudioUri] = useState<string | null>(null); // nota de voz
const [enviando, setEnviando] = useState(false);           // spinner ENVIAR
const [exito, setExito] = useState<Reporte | null>(null);  // pantalla "¡Listo!"
```

> Cada `useState` guarda un dato del formulario. Cuando el vecino toca algo,
> se llama al `set...` correspondiente y la pantalla se actualiza sola.

### 5.2. Cuándo se habilita ENVIAR (`src/app/reportar.tsx:63`)

```ts
const puedeEnviar = tipoId !== null && fotos.length >= 1 && !enviando;
```

> Traducción: "hay tipo elegido **y** al menos 1 foto **y** no estoy enviando".
> Esto cumple la regla del PRD en la interfaz: el botón se ve apagado hasta
> que se cumple (reportar.tsx:189-203).

### 5.3. Permiso de cámara (`src/components/reportes/camara-reporte.tsx:23-39`)

```ts
const asegurarPermiso = async (): Promise<boolean> => {
  if (permiso?.granted) return true;        // ya lo tiene: sigue
  return solicitarPermiso(
    async () => {
      const r = await pedirPermiso();       // pide al sistema
      return { granted: r.granted, canAskAgain: r.canAskAgain, status: r.status };
    },
    { tituloDenegado: "Necesitamos la cámara", ... }  // textos amigables
  );
};
```

> Primero mira si el permiso ya está dado. Si no, lo pide con mensajes
> amigables. Si el usuario lo bloqueó desde el sistema (`canAskAgain: false`),
> ofrece "Abrir ajustes" (permisos.ts:33-40).

### 5.4. Sacar la foto (`src/components/reportes/camara-reporte.tsx:41-55`)

```ts
const tomarFoto = async () => {
  const ok = await asegurarPermiso();       // 1. permiso
  if (!ok) return;
  const foto = await ref.current.takePictureAsync({ quality: 0.7 }); // 2. foto
  if (foto?.uri) { onFoto(foto.uri); onCerrar(); } // 3. la devuelve y cierra
};
```

> Tres pasos: permiso → foto (`quality: 0.7` para que no pese de más) →
> devuelve la URI temporal al padre, que la hace persistente con
> `guardarFoto()` (seccion-foto.tsx:24-31).

### 5.5. Grabar y guardar la nota de voz (`src/components/reportes/nota-de-voz.tsx:57-89`)

```ts
const empezar = async () => {
  const ok = await asegurarMicrofono();     // 1. permiso de micrófono
  if (!ok) return;
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  await recorder.prepareToRecordAsync();
  recorder.record();                        // 2. graba (.m4a alta calidad)
};

const parar = async () => {
  await recorder.stop();                    // 1. frena
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  const tmp = recorder.uri;                 // 2. URI temporal
  const persistente = await guardarAudio(tmp, directorioBorrador); // 3. persiste
  onCambiar(persistente);
};
```

> El teléfono tiene dos modos: grabar y escuchar. Hay que cambiarlos con
> `setAudioModeAsync`, si no el parlante puede no sonar. Al parar, el
> archivo se copia a persistente igual que las fotos.

### 5.6. Copiar a persistente (`src/servicios/almacenamiento.ts:27-48`)

```ts
async function copiarAReporte(uriTemporal, id, nombreBase) {
  const dir = directorioReporte(id);        // document/reportes/<id>/
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  const origen = new File(uriTemporal);     // archivo temporal (cache)
  const destino = new File(dir, `${nombreBase}${extensionDe(...)}`);
  await origen.copy(destino);               // copia, no mueve
  return destino.uri;                       // URI persistente
}
```

> Usa la API **nueva** de `expo-file-system` (`File`, `Directory`, `Paths`).
> Así los archivos sobreviven reinicios y valen aunque se envíe sin señal.

### 5.7. Crear el reporte (`src/servicios/reportes.ts:37-66`)

```ts
export async function crearReporte(borrador: BorradorReporte): Promise<Reporte> {
  if (borrador.fotos.length < 1) {
    throw new Error("FOTO_REQUERIDA: El reporte necesita al menos una foto.");
  }
  const numero = Math.floor(10000 + Math.random() * 89999);
  return { ..., codigo: `GCHU-2026-${numero}`, estado: "recibido", sincronizado: false, ... };
}
```

> Valida la regla del PRD por segunda vez (por si alguien llama al servicio
> directo) y genera el código de seguimiento. `sincronizado: false` es el
> gancho que Alexis usará para la cola offline.

---

## 6. Guion para la defensa (2–3 minutos)

> "Me tocó el Módulo del Vecino: la pantalla para crear un reporte.
> El vecino elige el tipo de problema, saca la foto —que es obligatoria por
> el PRD— o la elige de la galería, puede sumar una segunda foto, describe
> escribiendo o con una nota de voz, y al enviar recibe su código de
> seguimiento.
>
> Lo hice con cuatro librerías de Expo: `expo-camera` para la cámara,
> `expo-image-picker` para la galería, `expo-audio` para la nota de voz y
> `expo-file-system` para guardar los archivos en una carpeta persistente
> del teléfono, porque los archivos temporales el sistema los puede borrar.
>
> Los permisos los manejo con mensajes amigables: si el usuario niega,
> ofrezco reintentar; si los bloqueó desde el sistema, ofrezco abrir
> ajustes. Y negar la cámara no bloquea la galería.
>
> Todo pasa por una capa de servicios asíncrona, que hoy devuelve mocks y
> mañana la API real sin cambiar las pantallas. La validación 'sin foto no
> hay reporte' está en la interfaz y en el servicio.
>
> Dejé las conexiones pendientes marcadas con TODO: el GPS y la cola
> offline son de Alexis, la navegación final de Alan y el seguimiento de
> Frank."

---

## 7. Cuestionario: 20 preguntas y respuestas

**1. ¿Qué es el Módulo del Vecino?**
La parte de la app donde el vecino crea un reporte: elige el tipo de
problema, saca la foto, describe (texto o voz) y envía. Es la pantalla
`reportar.tsx` con sus componentes.

**2. ¿Qué librerías de Expo usaste y para qué?**
Cuatro: `expo-camera` (foto con `CameraView`), `expo-image-picker`
(galería), `expo-audio` (grabar/escuchar nota de voz) y
`expo-file-system` (guardar archivos en persistente). Están en
`package.json:8-16` y declaradas con sus permisos en `app.json:36-54`.

**3. ¿Por qué la foto es obligatoria?**
Porque lo pide el PRD: *"Sin foto no hay reporte. Es lo único que nos
evita las discusiones."* El operador necesita la evidencia para no
discutir con el vecino.

**4. ¿Dónde se valida que haya al menos 1 foto?**
En dos lugares: en la interfaz, el botón ENVIAR se habilita solo si
`fotos.length >= 1` (reportar.tsx:63); y en el servicio, `crearReporte`
lanza el error `FOTO_REQUERIDA` si no hay fotos (reportes.ts:38-40).
Doble validación por seguridad.

**5. ¿Qué es `useState` y qué datos guardás en `reportar.tsx`?**
Es la "memoria" del componente: cada cambio redibuja la pantalla.
Guardás el tipo elegido, las fotos, la descripción, el audio, si está
enviando, errores y el reporte exitoso (reportar.tsx:31-42).

**6. ¿Qué hace el `useEffect` que carga los tipos?**
Al abrir la pantalla llama a `listarTiposDeReporte()`, guarda la lista en
estado y maneja carga y error con reintento (reportar.tsx:44-61). La
variable `vivo` evita actualizar el estado si la pantalla ya se cerró.

**7. ¿Por qué los servicios son `async` si hoy devuelven mocks?**
Para que las pantallas no cambien cuando llegue la API real o SQLite.
Hoy devuelven datos de mentira, mañana harán `fetch` o consultas a la
base; como ya son promesas, la pantalla sigue igual (reportes.ts:1-13).

**8. ¿Por qué las pantallas no importan mocks directamente?**
Porque existe una **capa de servicios**: las pantallas solo llaman a
`funciones` (`listarTiposDeReporte`, `crearReporte`). Así, cambiar la
fuente de datos (mock → API) toca un solo archivo y no todas las
pantallas.

**9. ¿Cómo se abre y se usa la cámara?**
El botón "Tomar foto" abre un `Modal` con el componente `CamaraReporte`
(seccion-foto.tsx:89-95). Adentro, `CameraView` muestra el visor con la
lente trasera y `takePictureAsync({ quality: 0.7 })` saca la foto,
devolviendo su URI temporal (camara-reporte.tsx:41-55).

**10. ¿Por qué la cámara vive en un `Modal`?**
Porque solo puede haber **un** visor de cámara activo a la vez. El `Modal`
la abre, se saca la foto y se cierra (`onCerrar`), liberando la cámara.

**11. ¿Qué pasa si el usuario niega el permiso de cámara?**
Se muestra un cartel amigable con **"Reintentar"** que vuelve a pedir el
permiso (permisos.ts:41-55). El flujo no se rompe: el vecino puede
cancelar o usar la galería.

**12. ¿Qué pasa si el permiso está bloqueado desde el sistema?**
Cuando el sistema ya no va a volver a preguntar (`canAskAgain: false`),
se muestra otro cartel con **"Abrir ajustes"** que lleva a la
configuración del teléfono con `Linking.openSettings()` (permisos.ts:33-40).

**13. ¿Cómo funciona la galería y por qué sigue andando si la cámara está negada?**
`abrirGaleria()` usa el selector moderno del sistema, que no siempre
necesita permiso (seccion-foto.tsx:33-43). Son permisos independientes:
negar la cámara no bloquea adjuntar una foto previa, y el plan lo pide
así a propósito.

**14. ¿Por qué el límite es de 2 fotos?**
Porque lo pide el PRD: una obligatoria y una segunda opcional "si con
una no se entiende". La constante `MAX_FOTOS = 2` apaga los botones al
llegar al tope (seccion-foto.tsx:13, 51-58).

**15. ¿Cómo se graba y escucha la nota de voz?**
Con los hooks de `expo-audio`: `useAudioRecorder` para grabar en `.m4a`
alta calidad y `useAudioPlayer` para escuchar/pausar, mostrando tiempos
con `formatoTiempo` (nota-de-voz.tsx:32-35, 113-142). La nota es opcional.

**16. ¿Por qué se cambia el "modo de audio" al grabar y al escuchar?**
El teléfono tiene dos modos (`allowsRecording: true/false`). Si no se
cambia, el parlante puede no sonar al escuchar. Se cambia al empezar a
grabar, al parar y al reproducir (nota-de-voz.tsx:62, 76, 93).

**17. ¿Dónde se guardan las fotos y el audio en el celular?**
En la carpeta persistente `document/reportes/borrador-<fecha>/`, con
nombres como `foto-<fecha>.jpg` y `audio-<fecha>.m4a`
(almacenamiento.ts:12-14, 40-48). Sobrevive reinicios.

**18. ¿Qué diferencia hay entre cache y persistente, y por qué copiar?**
La foto recién sacada y el audio recién grabado viven en una carpeta
**temporal (cache)** que el sistema puede borrar cuando quiere. Por eso
`guardarFoto()`/`guardarAudio()` los **copian** a la carpeta persistente
`document/` (almacenamiento.ts:1-10, 27-37).

**19. ¿Qué es `BorradorReporte` y qué contiene?**
El contrato de datos del reporte "en construcción": tipo, descripción,
fotos, audio, coordenadas, dirección y zona (tipos/borrador.ts:11-21).
La pantalla lo arma y `crearReporte()` lo convierte en un `Reporte` con
código, estado `recibido` y `sincronizado: false`.

**20. ¿Cómo se genera el código `GCHU-2026-XXXXX`?**
Con un número aleatorio de 5 dígitos:
`Math.floor(10000 + Math.random() * 89999)` → `GCHU-2026-${numero}`
(reportes.ts:41-45). Es lo que el vecino anota para seguir su reclamo.
