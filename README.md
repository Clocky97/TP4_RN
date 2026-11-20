# Biblioteca IPF

App de la biblioteca del Instituto Politécnico Formosa, hecha con React Native y Expo Router.
Permite consultar el catálogo, reservar libros, recibir un recordatorio de devolución y, al
personal, entregar los libros respetando el orden de la lista de espera.

Trabajo Práctico N° 4 — Taller Complementario React Native II.
Las respuestas de análisis (Partes B a E) están en [`RESPUESTAS.md`](./RESPUESTAS.md).

## Versiones

| Herramienta         | Versión   |
| ------------------- | --------- |
| Expo SDK            | 58        |
| expo-router         | 58.0.32   |
| React Native        | 0.88.1    |
| React               | 19.3.0    |
| TypeScript          | 6.0.3     |
| expo-camera         | 58.0.14   |
| expo-notifications  | 58.1.9    |
| AsyncStorage        | 2.2.0     |

El proyecto se creó con `npx create-expo-app@latest` (SDK 58) y todos los paquetes se
instalaron con `npx expo install`.

## Cómo ejecutar

```bash
npm install
npx expo start
```

Escanear el QR con **Expo Go** (Android o iOS) en un teléfono conectado a la misma red.
La app fue pensada para un teléfono real: la cámara y las notificaciones locales no se
pueden probar completas en el emulador ni en la vista web.

Credenciales del personal (fijas en `src/constants/biblioteca.ts`):

- usuario: `personal`
- clave: `biblioteca`

## Árbol de rutas

```
src/app
├── _layout.tsx                    Stack raíz (todas las pantallas, modales y rutas protegidas)
├── (tabs)
│   ├── _layout.tsx                Tabs (con `anchor: 'index'`)
│   ├── index.tsx                  /                         Catálogo
│   └── reservas.tsx               /reservas                 Mis reservas
├── libro/
│   └── [isbn].tsx                 /libro/[isbn]             Detalle (Stack raíz)
├── buscar.tsx                     /buscar                   Buscador (Stack raíz)
├── escanear.tsx                   /escanear                 Escáner (Stack raíz)
├── reservar/
│   └── [isbn].tsx                 /reservar/[isbn]          Confirmación (modal)
├── permisos/
│   └── [recurso].tsx              /permisos/[recurso]       Pantalla previa (modal)
├── login.tsx                      /login                    Acceso del personal (modal, solo sin sesión)
├── mostrador.tsx                  /mostrador                Mostrador (solo con sesión)
├── reserva.tsx                    /reserva                  Redirección a /reservas
└── +not-found.tsx                 cualquier otra URL        404
```

- **Stack raíz** (`src/app/_layout.tsx`): contiene `(tabs)` como ancla y, arriba, las
  pantallas de detalle, buscador, escáner, los modales y las rutas protegidas
  (`login` solo sin sesión; `mostrador` solo con sesión).
- **Tabs** (`src/app/(tabs)/_layout.tsx`): Catálogo y Mis reservas. Se importa desde
  `expo-router/js-tabs`, que es el import que corresponde al SDK 58 (el export `Tabs`
  de `expo-router` quedó deprecado en esta versión).
- El `anchor` del Stack raíz es `(tabs)`, así un deep link a `/buscar` deja las pestañas
  debajo en la pila y el botón atrás vuelve al Catálogo.

## Estructura del código

```
src
├── app/          solo rutas (Expo Router)
├── components/   un componente por archivo
├── constants/    tema (colores, tamaños, espaciados) y constantes de la biblioteca
├── context/      BibliotecaContext: préstamos, esperas, recientes, avisos y sesión
├── data/         libros.ts (17 libros y listas de espera iniciales)
├── estructuras/  Pila.ts y Cola.ts
├── hooks/        useLibros, useBusqueda y usePermiso
├── lib/          api, persistencia, notificaciones, ISBN, fechas y permisos
└── types/        Libro, Prestamo, Aviso y resultados de las operaciones
```

## app.json

### Bloque `plugins` comentado

```jsonc
"plugins": [
  // Habilita el enrutado por archivos y los deep links.
  "expo-router",
  [
    "expo-camera",
    {
      // Texto de propósito que iOS muestra en el diálogo del sistema.
      "cameraPermission": "Usamos tu cámara para leer el código de barras del libro y abrir su ficha sin que escribas el ISBN.",
      // La app no graba audio: sin NSMicrophoneUsageDescription en iOS.
      "microphonePermission": false,
      // Tampoco declara RECORD_AUDIO en Android.
      "recordAudioAndroid": false,
      // Necesario para leer el EAN-13 de la contratapa.
      "barcodeScannerEnabled": true
    }
  ],
  [
    "expo-notifications",
    {
      "color": "#1D4E89",
      // Canal por defecto que se crea en Android antes de pedir el permiso.
      "defaultChannel": "prestamos",
      // Solo se usan notificaciones locales: sin entitlement de push remoto en iOS.
      "enableRemoteNotifications": false
    }
  ],
  [
    "expo-splash-screen",
    {
      "backgroundColor": "#1D4E89",
      "image": "./assets/images/splash-icon.png",
      "imageWidth": 76
    }
  ]
]
```

El esquema de deep links es `"scheme": "bibliotecaipf"` y las rutas tipadas están activas
con `"experiments": { "typedRoutes": true }`.

## Permisos

| Recurso | Módulo | Cuándo se pide | Alternativa si se niega |
| --- | --- | --- | --- |
| Cámara | `expo-camera` (`useCameraPermissions`) | Al tocar “Habilitar cámara” en `/escanear`, después de la pantalla previa `/permisos/camara` | Escribir el ISBN a mano en la misma pantalla |
| Notificaciones | `expo-notifications` | Únicamente al activar el interruptor “Recordarme” de un préstamo (primero se crea el canal `prestamos` en Android) | Los avisos se muestran dentro de la app, en `/reservas` |
| Ajustes del sistema | `Linking.openSettings` | Cuando el permiso quedó bloqueado (`canAskAgain: false`) | Nada: la app sigue funcionando sin cámara o sin notificaciones |

La app no pide ubicación, contactos, micrófono ni acceso a archivos.

### `blockedPermissions` y mínimo privilegio

```json
"blockedPermissions": [
  "android.permission.RECORD_AUDIO",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_MEDIA_AUDIO"
]
```

`expo-camera` declara `RECORD_AUDIO` por defecto porque también sirve para grabar video.
Esta app solo lee códigos de barras, así que además de `recordAudioAndroid: false` se
bloquea el permiso a nivel manifiesto: si una dependencia futura lo agrega, la app no lo
declara. Las demás entradas bloquean permisos de ubicación y de almacenamiento que la app
no usa (el escáner y las notificaciones no los necesitan), para que la ficha de la tienda
muestre solo lo que la app realmente hace.

## Deep links de prueba

Con Expo Go (reemplazar `192.168.x.x` por la IP de la computadora):

```
exp://192.168.x.x:8081/--/libro/9788437604947
exp://192.168.x.x:8081/--/libro/123
exp://192.168.x.x:8081/--/buscar?q=borges
exp://192.168.x.x:8081/--/reserva
exp://192.168.x.x:8081/--/mostrador
exp://192.168.x.x:8081/--/escanear
exp://192.168.x.x:8081/--/permisos/camara
exp://192.168.x.x:8081/--/ruta-inexistente
```

Con un development build, usando el esquema de la app:

```
bibliotecaipf://libro/9788437604947
bibliotecaipf://buscar?q=borges
bibliotecaipf://reserva
```

- `/libro/123` abre el detalle y muestra el mensaje de ISBN inexistente.
- `/reserva` redirige a `/reservas`.
- `/mostrador` sin sesión vuelve al Catálogo (la ruta está protegida con `Stack.Protected`).
- Cualquier URL desconocida muestra la pantalla 404 con la dirección pedida.

## Verificación

```bash
$ npx expo lint
# sin salida: no hay errores ni advertencias
$ echo $?
0

$ npx tsc --noEmit
# sin salida: no hay errores de tipos
$ echo $?
0
```

También se verificó el bundle con `npx expo export --platform android` y
`npx expo export --platform web`, ambos sin errores.

## Capturas

En [`capturas/`](./capturas) están las capturas de la vista web del proyecto (catálogo
cargando, con datos y con error; buscador; detalle inexistente; reserva con y sin
ejemplares; mis reservas; escáner en el estado de permiso; pantalla previa de permisos;
mostrador antes y después de entregar; 404).

La cámara y las notificaciones necesitan un teléfono real (Expo Go o development build);
en la vista web no existen. Las capturas que faltan son: los cuatro estados del escáner
con la cámara, el diálogo de permiso con el texto de propósito y la notificación recibida.
Para obtenerlas: abrir la app en Expo Go, entrar a `/escanear`, aceptar la cámara y apoyar
un EAN-13 real; y en `/reservas` activar “Recordarme” en un préstamo y esperar 15 segundos.
