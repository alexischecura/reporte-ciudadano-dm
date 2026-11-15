# Reporte Ciudadano

**Trabajo Integrador Final — Desarrollo para Móviles | UNER, 2026**

Reporte Ciudadano es una aplicación móvil que desarrollamos como trabajo final de la materia. La idea es que los vecinos de **Gualeguaychú** puedan informar problemas en la vía pública desde el celular, ubicarlos en el mapa y seguir el estado del reclamo sin tener que hacer todo el trámite de manera presencial.

El proyecto tiene dos perfiles: **vecino**, para crear y consultar reportes, y **operador**, para revisar los reclamos y gestionar su atención. Es un desarrollo académico pensado para ese contexto; no es una aplicación oficial publicada por la Municipalidad.

## Integrantes

- Juan Sommaruga
- Frank Fobello
- Alan García Talma
- Alexis Nehuén Checura

**Repositorio:** https://github.com/alexischecura/reporte-ciudadano-dm

## Qué se puede hacer

**Como vecino:**

- Registrarse e iniciar sesión.
- Crear un reporte con tipo de problema, descripción, ubicación en el mapa y fotografías. También se puede adjuntar una nota de voz.
- Seleccionar un punto dentro de Gualeguaychú y obtener su dirección aproximada.
- Consultar los reclamos propios, sus estados y el seguimiento mediante el código QR.
- Ver reportes cercanos en el mapa y las opciones disponibles para evitar reclamos repetidos.
- Guardar reportes pendientes cuando no hay conexión y reintentar su envío al recuperar internet.
- Configurar el desbloqueo biométrico en dispositivos compatibles.

**Como operador:**

- Consultar la bandeja de reportes y filtrarla.
- Revisar el detalle de cada reclamo.
- Actualizar estados, agregar comentarios y asignar cuadrillas.
- Adjuntar fotografías de resolución.
- Identificar reportes duplicados y vincularlos con un reporte original.

La app también incorpora notificaciones locales y la integración móvil necesaria para recibir notificaciones push. Para que las push lleguen a los dispositivos, tienen que estar configurados tanto el servicio de notificaciones como el backend y las credenciales de Firebase.

## Tecnologías utilizadas

- **React Native + Expo SDK 57** para la aplicación móvil.
- **TypeScript** para el código.
- **Expo Router** para la navegación.
- **API REST** para autenticación, reportes y gestión del operador.
- **React Native Maps y Expo Location** para mapas, coordenadas y direcciones.
- **Expo Camera, Image Picker y Audio** para los archivos que acompañan los reclamos.
- **Expo SecureStore** para el token de sesión y preferencias de acceso.
- **Expo SQLite** para guardar datos locales y manejar los reportes pendientes.
- **Expo Notifications** para notificaciones.

## Cómo ejecutar el proyecto

Se necesita **Node.js**, npm y un dispositivo Android o emulador. Para probar las funciones nativas usamos una *development build*; Expo Go puede tener limitaciones, especialmente con notificaciones.

1. Clonar el repositorio:

   ```bash
   git clone https://github.com/alexischecura/reporte-ciudadano-dm.git
   cd reporte-ciudadano-dm
   ```

2. Instalar las dependencias:

   ```bash
   npm ci
   ```

3. Crear un archivo `.env` tomando como referencia `.env.example`. Configurar:

   ```env
   EXPO_PUBLIC_API_URL=https://URL-DE-LA-API
   GOOGLE_MAPS_API_KEY=CLAVE-DE-GOOGLE-MAPS
   ```

   Para compilar Android con notificaciones push también se utiliza `GOOGLE_SERVICES_JSON`, que debe apuntar al archivo `google-services.json` correspondiente al proyecto Firebase. **No subir claves privadas ni archivos de credenciales al repositorio.**

4. Iniciar Metro para una compilación de desarrollo instalada:

   ```bash
   npx expo start --dev-client --lan
   ```

   Abrir Reporte Ciudadano en el teléfono y conectarlo al servidor de desarrollo. El teléfono y la computadora deben estar en la misma red.

### Generar una APK

El proyecto incluye los perfiles de EAS en `eas.json`:

```bash
# APK para desarrollar y probar con Metro
npx eas-cli build --platform android --profile development

# APK instalable para probar o entregar, sin depender de Metro
npx eas-cli build --platform android --profile preview
```

Para estas compilaciones es necesario contar con acceso al proyecto de Expo/EAS y configurar las variables del entorno correspondiente. En particular, para Google Maps y las notificaciones, hay que revisar las credenciales de Android antes de compilar.

## Pruebas

Agregamos pruebas automatizadas para las partes de la aplicación que necesitaban más cuidado: la cola offline, las notificaciones y la lógica de los mapas.

```bash
npm run test:offline
npm run test:notificaciones
npm run test:mapa
```

En la versión de código revisada, los tres conjuntos completaron **53 pruebas sin fallos**: 34 de offline, 8 de notificaciones y 11 de mapa. Estas pruebas verifican la lógica del proyecto, pero no reemplazan la comprobación de la APK en un teléfono real ni la conexión con la API.

Para revisar los tipos de TypeScript:

```bash
npx tsc --noEmit
```

## Algunas decisiones del proyecto

**Ubicación.** El mapa comienza en Gualeguaychú porque el sistema está pensado para registrar problemas de esa ciudad. La ubicación elegida se guarda con coordenadas y, cuando el servicio lo permite, se obtiene también una dirección escrita. La validación territorial no debería depender únicamente de lo que muestra el mapa.

**Conexión.** Si no hay internet, el usuario puede conservar un reporte pendiente. La aplicación intenta sincronizarlo cuando vuelve a tener una conexión válida. Como utiliza almacenamiento nativo, este circuito debe probarse en el dispositivo de entrega.

**Sesión.** El token se guarda con SecureStore; no se almacena en SQLite. La biometría es opcional y depende de las capacidades y configuración del teléfono.

**Notificaciones.** Hay una parte implementada en la aplicación y otra que depende del servidor, Expo Push y Firebase. Para probar avisos remotos reales hace falta utilizar una compilación propia, conceder permisos y configurar el servicio externo.

## Para probar la entrega

Lo más útil es recorrer el circuito completo con **dos cuentas de prueba**, una de vecino y otra de operador:

1. Iniciar sesión como vecino y crear un reporte en Gualeguaychú.
2. Comprobar que aparezca entre los reclamos enviados.
3. Ingresar como operador, abrir ese reporte y modificar su estado o asignarle una cuadrilla.
4. Volver a la cuenta de vecino y verificar que el seguimiento refleje el cambio.
5. Probar, por separado, las notificaciones y el envío de un reporte sin conexión.

Las credenciales de las cuentas de prueba se comparten **por el medio indicado para la entrega**, no dentro del código ni de este archivo.

---

Proyecto desarrollado para la materia **Desarrollo para Móviles — Universidad Nacional de Entre Ríos (2026)**.
