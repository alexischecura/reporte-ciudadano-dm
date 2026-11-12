# Guía del proyecto Reporte Ciudadano

Análisis del repositorio al 12 de noviembre de 2026, actualizado después del merge `7f2fd9b` de `origin/main` en `dev`. Fuente funcional: `Reporte Ciudadano.pdf` (11 páginas). Este documento distingue lo solicitado de lo observado en el código; la presencia de una pantalla o dependencia no acredita su funcionamiento en dispositivos.

## Objetivo y alcance

Aplicación para la Municipalidad de Gualeguaychú que permite reportar problemas de la vía pública con foto y ubicación, obtener un número de seguimiento y conocer el avance del reclamo. Busca evitar duplicados y reemplazar la gestión manual por una bandeja municipal organizada.

La misma aplicación tiene dos roles: vecino y operador. La primera versión incluye creación, seguimiento, mapa público, adhesiones, gestión del operador, avisos, zonas y cuadrillas. Quedan fuera turnos, pagos, trámites, chat, tableros estadísticos, expedientes y encuestas.

## Requisitos funcionales del PDF

- Crear un reporte en menos de un minuto: tipo, una foto obligatoria y una segunda opcional, ubicación GPS corregible y descripción escrita o nota de voz.
- Permitir seleccionar la ubicación manualmente si se deniega el GPS. Explicar permisos denegados y ofrecer abrir ajustes cuando corresponda.
- Guardar primero en el teléfono y sincronizar automáticamente al volver la conexión, sin perder el reporte ni su multimedia al reiniciar.
- Mostrar código de seguimiento, reportes propios del más nuevo al más viejo, historial y QR para consulta en el mostrador.
- Respetar cinco estados: `recibido`, `en_revision`, `asignado`, `resuelto`, `rechazado`. Mostrar motivo del rechazo y foto del arreglo al resolver.
- Mostrar reportes públicos por estado, filtros de tipo y estado, cercanía y advertencia de posibles duplicados a menos de 50 metros antes de crear. Permitir adhesiones.
- Dar al operador filtros por estado, tipo y zona, cambios comentados, asignación de cuadrillas, marcado de duplicados y cierre con foto.
- Avisar cambios de estado y adhesiones, con opción de desactivar avisos. Asociar automáticamente la zona por ubicación y consultar sus cuadrillas.
- Priorizar Android sin excluir iPhone, usar textos y botones grandes y evitar exponer datos personales del autor en el mapa público.

## Stack y estructura

Versiones declaradas en `package.json`: Expo `~57.0.32`, React Native `0.86.3`, React `19.2.3`, TypeScript `~6.0.3` y Expo Router `~57.0.30`. Estilos principalmente con `StyleSheet`. TypeScript estricto y alias `@/*` hacia `src/*`.

| Ubicación | Responsabilidad |
| --- | --- |
| `src/app/` | Rutas de Expo Router, acceso, seguridad y formulario de reporte |
| `src/app/(tabs)/` | Inicio, mapa, seguimiento y perfil del vecino; también existe `explore.tsx` |
| `src/contexts/sesion-context.tsx` | Usuario, restauración de sesión, acceso y bloqueo biométrico |
| `src/servicios/` | HTTP, autenticación, reportes, sesión, preferencias y archivos |
| `src/tipos/` | Contratos del dominio y respuestas de API |
| `src/mocks/` | Datos de ejemplo tipados |
| `src/components/reportes/` | Cámara, fotos, audio, selección de ubicación, reportes cercanos y controles de filtros del mapa |
| `src/components/seguimiento/` | Lista propia, historial y QR |
| `src/components/operador/` | Bandeja del operador integrada a su ruta, todavía basada en mocks |
| `src/utils/` | Permisos, háptica, distancias, cobertura municipal y filtros de reportes |
| `app.json`, `app.config.js`, `eas.json` | Configuración Expo, plugins, Maps y builds |

## Estado observado

| Área | Implementación actual y límites |
| --- | --- |
| Acceso | Login y registro contra API, validación con `/yo`, token nativo en SecureStore y rutas protegidas por sesión y rol. |
| Biometría | Detección, autenticación y preferencia por usuario en KV. La restauración distingue sesión anónima, bloqueada, sin conexión y autenticada. |
| Crear reporte | Consulta tipos, exige foto y ubicación, admite hasta dos fotos, texto y audio; sube archivos y luego crea el reporte por API. Muestra el código devuelto. |
| Ubicación | Usa `expo-location`, geocodificación inversa y mapa para seleccionar el punto. La corrección actual se realiza tocando el mapa; revisar el gesto de arrastre solicitado. |
| Multimedia | Cámara con `CameraView`, galería, grabación/reproducción con `expo-audio` y copia a almacenamiento persistente con `File`, `Directory`, `Paths`. |
| Seguimiento | Consulta `/yo/reportes`, tipos e historial; muestra estados y QR. Verificar en integración orden descendente, motivo de rechazo y foto del arreglo. |
| Mapa | Consulta todas las páginas de la API e incluye los cinco estados. Dibuja marcadores por estado y permite filtros combinables por tipo y estado, limpiar filtros y ver reportes a 1 km de la ubicación actual. Mantiene detalle, historial, QR y adhesiones. Los filtros solo existen en la exploración general. |
| Duplicados y cobertura | Al seleccionar una ubicación en el formulario consulta `/reportes/cercanos` con radio de 50 m, sin filtros por tipo ni estado. Muestra tarjetas y marcadores de reclamos abiertos, permite adherirse o consultar los propios y solicita confirmación antes de enviar otro si hay coincidencias. Incluye carga, reintento, errores y descarte de respuestas atrasadas. Un error de búsqueda requiere confirmar que se quiere enviar sin verificar. A más de 15 km del centro de Gualeguaychú muestra un aviso sin bloquear; radio acordado con el usuario, no un polígono municipal oficial. |
| Operador | `/operador` ya integra `ListaReportesOperador.tsx` y permite abrir `/operador-perfil`, que reutiliza el perfil existente. Ambas rutas están protegidas para el rol operador. La bandeja usa mocks directos y registra cambios con `console.log`, sin actualizar los reportes ni persistirlos. Incluye filtros agrupados por estado y formulario con comentario obligatorio, cuadrilla requerida al asignar y foto requerida al resolver. Faltan filtros por tipo/zona y marcado de duplicados. |
| Offline | Los archivos se conservan localmente, pero el formulario vive en estado React. No hay cola persistente de reportes, restauración de borrador ni sincronización automática. El envío depende de red. |
| Avisos | No se observa implementación de notificaciones ni configuración de avisos; `expo-notifications` y `expo-network` no están declarados. `avisosActivos` existe en el tipo Usuario. |
| Zonas y cuadrillas | Hay tipos y mocks; falta integración funcional en la bandeja. La asignación automática de zona no está implementada en este cliente; verificar responsabilidad del backend. |
| Plataformas y entrega | Existen variantes web de algunos componentes, pero SecureStore devuelve `null` y no guarda tokens en web; mapas nativos y archivos requieren revisar compatibilidad. EAS define perfiles development y preview con APK, sin perfil production. |

El README describe funcionalidades objetivo, como offline y avisos, que todavía no están completas. Los comentarios TODO también pueden estar desactualizados: por ejemplo, el borrador aún menciona GPS mock aunque el formulario ya usa ubicación real.

El merge también incorpora ajustes visuales en la bandeja, iconos y splash, y limita la corrección de texto de `TextoCorregido` al Motorola Moto E14 con arquitectura de 32 bits indicada en el componente.

## API y persistencia

El proyecto ya consume una API real; no funciona enteramente con mocks. La URL base se toma de `EXPO_PUBLIC_API_URL`. `src/servicios/http.ts` agrega `Authorization: Bearer <token>`, maneja errores con `ApiError` y extrae `datos` de la respuesta. Actualmente descarta `meta`; contemplarlo al implementar paginación.

Endpoints usados: `/auth/ingreso`, `/auth/registro`, `/yo`, `/tipos-de-reporte`, `/reportes`, `/yo/reportes`, `/reportes/:id`, `/reportes/:id/cambios`, `/reportes/:id/adhesion`, `/reportes/:id/adhesiones`, `/reportes/cercanos` y `/archivos`. La carga multipart usa el campo `archivo`. No asumir endpoints administrativos sin verificar el contrato del backend.

`crearReporte` sube fotos en paralelo y luego audio antes de crear el reporte. Un fallo intermedio puede dejar archivos subidos sin reporte; no existe reanudación ni garantía de idempotencia. El campo `sincronizado` está en el contrato, pero eso no constituye una cola offline.

## Convenciones para continuar

- Mantener las entidades en `src/tipos/`: Reporte, Foto, Coordenadas, TipoDeReporte, CambioDeEstado, Usuario, Zona y Cuadrilla. No duplicar contratos en pantallas.
- Usar identificadores string, fechas ISO 8601 con zona, claves camelCase y `null` para valores sin contenido, según el PDF. El payload actual omite `descripcion` cuando es nula y omite teléfono vacío al registrar: revisar compatibilidad antes de modificarlo.
- Toda lectura y escritura de negocio debe pasar por servicios asíncronos. El prototipo del operador que importa mocks directamente es deuda existente, no un patrón a extender.
- Mantener los cinco estados del contrato aunque la interfaz los agrupe o traduzca. No introducir `pendiente` o `en_progreso` como estados de API.
- Conservar tokens en SecureStore; KV se usa para preferencias no sensibles. No incluir credenciales ni valores de `.env` en código, documentación o logs.
- Usar las APIs actuales ya presentes: `expo-audio` y `File`/`Directory`/`Paths`. El PDF solicita iconos de `@react-native-vector-icons/ionicons`, mientras el proyecto usa `@expo/vector-icons`; registrar y resolver esa diferencia al abordar iconografía.
- Reutilizar tema, componentes accesibles y manejo de permisos. Mantener mensajes claros en español y estados de carga, vacío y error.
- El mapa y seguimiento repiten tarjetas, historial y QR: extraer piezas compartidas cuando se trabaje esa área. Tras el merge ya no existe `src/components/reportes/detalle-reporte.tsx`; el servicio de historial está en `src/servicios/reportes.ts`.
- No considerar una tarea completa solo porque compila: probar capacidades nativas, permisos y persistencia en dispositivo o emulador. Documentar contradicciones del PDF y decisiones pendientes antes de cambiar reglas de negocio.

## Ejecución y validación

```sh
npm ci
cp .env.example .env
# Completar EXPO_PUBLIC_API_URL y GOOGLE_MAPS_API_KEY localmente.
npm start
npm run android
npm run ios
npm run web
npx tsc --noEmit
npm run lint
npm run test:mapa
```

Ejecutar los comandos de plataforma según el entorno disponible; iOS requiere herramientas de Apple. La API debe ser accesible desde el dispositivo. La clave de Maps se incorpora mediante `app.config.js`; cambios en configuración nativa pueden requerir recompilar el cliente. No usar `npm run reset-project` como paso de arranque: es un script de reinicio de la plantilla.

Validación de base realizada durante este análisis:

- `npx tsc --noEmit`: finaliza correctamente después de regenerar los tipos de rutas con el generador de Expo. `/operador-perfil` ya está incluida. Los archivos de `.expo/` son locales y no se versionan; al incorporar rutas nuevas, iniciar Expo para regenerarlos.
- `npm run lint`: finaliza sin errores ni advertencias. Se corrigieron efectos en sesión, seguimiento, ubicación inicial e hidratación web, imports duplicados, código sin uso y estilo de tipos de array.
- La ruta experimental `explore.tsx`, que no renderizaba contenido, ahora redirige a `/mapa`.
- Comprobación aislada de restauración de sesión con dependencias simuladas: seis escenarios correctos (sin token, sesión válida, biometría activa, error de red conservando token, token inválido y fallo de almacenamiento).
- `git diff --check`: sin errores de whitespace.
- `npm run test:mapa`: 11 casos correctos; pruebas automatizadas de distancia, cobertura municipal, combinación de filtros, radio de cercanía, consulta de duplicados, paginación y errores de red. Se ejecutan con Node y el compilador TypeScript existente, sin nuevas dependencias.
- `npx expo export --platform android --output-dir /tmp/reporte-ciudadano-export --max-workers 2`: bundle Android exportado correctamente.
- No se ejecutaron builds nativos, pruebas en dispositivos ni comprobaciones contra el backend desplegado. Se contrastó el contrato con el código del backend disponible en el directorio hermano, sin modificarlo.

## Prioridades sugeridas

1. Implementar borrador y cola offline persistentes, recuperación tras reinicio y sincronización con reintentos e idempotencia; preservar multimedia hasta confirmar el envío.
2. Conectar la bandeja del operador ya integrada con servicios reales: reemplazar mocks, persistir estados comentados, asignaciones y fotos, completar filtros por tipo/zona y duplicados, con autorización también en backend.
3. Validar en dispositivo la detección de duplicados a 50 m, cercanía a 1 km y filtros ya implementados; reemplazar el radio de aviso de 15 km por límites oficiales si la Municipalidad los provee.
4. Implementar notificaciones y preferencia de avisos, y verificar zonas y cuadrillas con la API.
5. Completar detalle compartido, comprobar accesibilidad y permisos en Android/iOS y preparar el build de producción EAS solicitado; mantener TypeScript y lint sin errores.

Actualizar este archivo cuando cambie la implementación; no presentar estas prioridades como funcionalidades ya entregadas.
