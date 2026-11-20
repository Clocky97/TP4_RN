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

Para probar el escáner con un libro físico, los dos ISBN reales que usé son
**9788437604947** (*Cien años de soledad*, Cátedra) y **9788437604572** (*Rayuela*,
Cátedra).

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
`npx expo export --platform web`, ambos sin errores, y `npx expo-doctor` (20/20 checks).

## Prueba en el teléfono

- Dispositivo: **Motorola Moto G23**, Android **14** (SDK 34), 720 × 1600.
- App: **Expo Go** con SDK 58, bundle servido por Metro desde la computadora.
- La red del instituto aísla a los clientes entre sí, así que el teléfono no podía bajar
  el bundle por la IP de la LAN. Se resolvió con `adb reverse tcp:8081 tcp:8081` y
  abriendo `exp://127.0.0.1:8081` (el resto de los deep links, con
  `exp://127.0.0.1:8081/--/…`).

Recorrido probado en el teléfono:

1. Catálogo: carga, error con “Reintentar”, datos, “Vistos recientemente” y recientes
   persistidos después de cerrar la app.
2. Buscador por URL (`/buscar?q=borges`) y resultados.
3. Detalle inexistente (`/libro/123`) y detalle real con el título en el header.
4. Reserva con ejemplares (préstamo a 7 días) y sin ejemplares (puesto 3 en la espera).
5. Escáner: permiso pendiente, diálogo del sistema, denegado, bloqueado con “Abrir
   Ajustes”, vuelta desde Ajustes con la pantalla actualizada sola, y cámara concedida.
6. ISBN escrito a mano: abre el detalle y al volver no regresa al escáner.
7. Notificación: “Recordarme” pide el permiso, programa el aviso y llega a los 15 segundos;
   al devolver el libro el recordatorio se cancela (no aparece).
8. Mostrador: login, entrega a Ana y a Luis (desencola), entrega a “Alumno IPF” con
   notificación “Tu reserva está lista”, y cierre de sesión.
9. `/reserva` redirige a `/reservas`; `/mostrador` sin sesión vuelve al Catálogo; una URL
   inexistente muestra la 404 con la dirección pedida.

## Capturas

En [`capturas/`](./capturas) están las capturas tomadas en el teléfono:

| Archivo | Estado |
| --- | --- |
| `01-catalogo-cargando.png` | Catálogo con el indicador de carga |
| `02-catalogo-con-datos.png` | Catálogo con los 17 libros |
| `03-catalogo-con-error.png` | Error de la API con “Reintentar” |
| `04-buscador.png` | Búsqueda “borges” con resultados |
| `05-detalle-inexistente.png` | `/libro/123` con el mensaje de validación |
| `06-reserva-sin-ejemplares.png` | Confirmación con lista de espera (puesto 3) |
| `07-reserva-con-ejemplares.png` | Confirmación con préstamo a 7 días |
| `08-mis-reservas.png` | Préstamo, recordatorio y reserva en espera |
| `09-mis-reservas-dos-prestamos.png` | Dos préstamos activos |
| `10-escanear-permiso.png` | Escáner con el permiso pendiente |
| `11-permisos-camara.png` | Pantalla previa de la cámara |
| `12-escaner-camera.png` | Cámara concedida y campo manual |
| `13-permisos-camara-bloqueado.png` | Permiso bloqueado con “Abrir Ajustes” |
| `14-escaner-bloqueado.png` | Escáner bloqueado, sin perder el ISBN manual |
| `15-permisos-camara-concedido.png` | Vuelta desde Ajustes: “Permiso concedido” |
| `16-dialogo-permiso-camara.png` | Diálogo del sistema de Android 14 |
| `17-dialogo-permiso-notificaciones.png` | Diálogo de notificaciones al activar “Recordarme” |
| `18-recordatorio-activo.png` | Interruptor activo y permiso concedido |
| `19-notificacion-recordatorio.png` | Notificación local recibida |
| `20-notificacion-reserva.png` | Notificación “Tu reserva está lista” |
| `21-notificacion-cancelada.png` | Sin notificación después de devolver |
| `22-mostrador-antes.png` | Mostrador con las dos listas de espera |
| `23-mostrador-despues.png` | Después de entregar, con el aviso |
| `24-pantalla-404.png` | URL inexistente |
| `25-expo-go-dialogo-camara.png` | Diálogo de permiso propio de Expo Go |
| `26-ajustes-camara.png` | Ajustes del sistema con el permiso de cámara |

El estado “cargando” del escáner (mientras `useCameraPermissions` resuelve) dura un
instante y no llegó a capturarse; los otros tres estados están en las capturas 10 a 15.
El escaneo con un código de barras físico no se pudo hacer en esta sesión (la cámara del
teléfono no tenía un libro a la vista); el camino manual sí está probado y la lectura
EAN-13 queda para probar con un libro real.
