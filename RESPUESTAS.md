# RESPUESTAS — TP4 “Biblioteca IPF”

Las referencias de línea corresponden a los archivos entregados en este repositorio.
El proyecto usa Expo SDK 58, React 19.3, React Native 0.88 y TypeScript en modo `strict`.

---

## Parte B · Estado, efectos y renderizado

### B1. El ciclo de vida de `useLibros`

El hook está en `src/hooks/useLibros.ts` (líneas 13-55) y lo consume el Catálogo en
`src/app/(tabs)/index.tsx` (línea 15).

#### a) Del montaje a la lista

**Con una carga exitosa hay 2 renders.**

1. **Render 1 — montaje.** Estado inicial: `libros = []`, `cargando = true`,
   `error = null` (`useLibros.ts` 14-16). Se ve `PantallaCargando`
   (`(tabs)/index.tsx` 22-24). Después del render corre el efecto (19-46): no llama a
   ningún `setState` de forma sincrónica; solo dispara `cargar()`, que queda esperando
   los 800 ms de `obtenerLibros()` (`src/lib/api.ts` 9-15). Por eso no hay un render
   extra mientras se espera.
2. **Render 2 — llegó la respuesta.** En el mismo bloque sincrónico se ejecutan
   `setLibros(datos)` y `setCargando(false)` (28-29). React los agrupa (batching) en un
   único render: `libros` = 17 libros, `cargando = false`, `error = null`. Se ve el
   `FlatList` con la lista.

El `setCargando(false)` del `catch` (37) también está en el mismo bloque que
`setError(...)` (34-36), así que el fallo también produce **un solo** render nuevo.

**Con error y “Reintentar” hay 2 renders más.**

3. **Render 3 — toca “Reintentar”.** `reintentar` (`useLibros.ts` 48-52) hace
   `setCargando(true)`, `setError(null)` e incrementa `intento` en el mismo manejador,
   así que React agrupa los tres cambios: `libros = []` (quedó vacío del intento
   fallido), `cargando = true`, `error = null`. La pantalla vuelve al indicador.
4. **Render 4 — respuesta del nuevo pedido.** Si sale bien: `libros` con datos,
   `cargando = false`, `error = null` (se ve la lista). Si falla otra vez: `libros = []`,
   `error` con el mensaje, `cargando = false` (se ve el mensaje y el botón).

El incremento de `intento` no produce un render propio: viaja en el mismo lote que
`cargando` y `error`. El efecto se vuelve a ejecutar *después* del render 3, y su
limpieza (43-45) invalida el pedido anterior antes de lanzar el nuevo.

#### b) ¿Se desmonta el Catálogo?

No se desmonta en ninguno de los dos casos:

- **Cambiar a “Mis reservas”**: el Catálogo sigue montado. Las pestañas de React
  Navigation conservan montadas las pantallas ya visitadas; solo se ocultan.
- **Abrir un detalle**: `/libro/[isbn]` se apila en el Stack raíz *por encima* de
  `(tabs)`, así que el Catálogo queda montado debajo.

Lo comprobé con la app en ejecución: al cambiar de pestaña y al abrir/cerrar el detalle,
el listado seguía en pantalla al volver y no se repetía el indicador de carga, así que la
pantalla no se remontó. Un `console.log` temporal en el `return` de limpieza (ya
eliminado, como pide la consigna) solo aparecería al desmontar.

La limpieza se ejecuta, entonces, en estas situaciones reales:

1. **Al desmontar el Catálogo**: cerrar la app, recargar el bundle (Fast Refresh) o
   cualquier situación que desmonte el árbol.
2. **Antes de volver a ejecutar el efecto** porque cambió `intento` (es decir, cada vez
   que la persona toca “Reintentar”). Esta es la ejecución importante: pone
   `activo = false` y hace que la respuesta del pedido viejo se descarte aunque llegue
   tarde.

#### c) Por qué no se puede pasar una `async` a `useEffect`

`useEffect` espera que el callback devuelva una función de limpieza o `undefined`. Una
función `async` **siempre** devuelve una promesa, y React intentaría llamar a esa promesa
como si fuera la limpieza (`TypeError: destroy is not a function`). Además, el `await`
retrasa el registro de la limpieza: no se podría cancelar nada de forma sincrónica.

Lo resolví declarando una función `async` adentro del efecto y llamándola sin esperarla
(`useLibros.ts` 22-41):

```ts
useEffect(() => {
  let activo = true;

  async function cargar() {
    try {
      const datos = await obtenerLibros();
      if (!activo) return;
      setLibros(datos);
      setCargando(false);
    } catch {
      if (!activo) return;
      setError('No pudimos cargar el catálogo. Revisá la conexión e intentá de nuevo.');
      setCargando(false);
    }
  }

  void cargar();

  return () => {
    activo = false;
  };
}, [intento]);
```

El efecto devuelve una limpieza sincrónica; la parte asíncrona queda adentro y siempre
consulta la bandera `activo` antes de tocar el estado.

#### d) Cómo implementé “Reintentar”

`reintentar` (`useLibros.ts` 48-52) primero deja la pantalla en estado de carga
(`setCargando(true)`, `setError(null)`) y después incrementa el contador `intento`.

El pedido se vuelve a ejecutar porque `intento` está en el array de dependencias del
efecto (46). Cambiar ese valor hace que React ejecute la limpieza y vuelva a correr el
efecto completo.

Elegí `intento` y no `cargando` o `error` porque esos dos son **salidas** del efecto:
ponerlos como dependencias crearía un ciclo (el efecto cambia `cargando`, eso vuelve a
disparar el efecto, que vuelve a pedir, etc.). `intento` es una entrada explícita que
solo cambia cuando la persona pide reintentar; su valor no lo modifica el efecto. Es, en
los hechos, un “número de versión del pedido”.

---

### B2. La condición de carrera del buscador

El hook es `src/hooks/useBusqueda.ts`. La búsqueda no usa `setTimeout`: cada cambio de
`q` dispara el efecto, y la protección contra respuestas viejas es la bandera `activo`
(30-56). El estado guardado incluye el texto y el número de intento al que corresponde
(`Busqueda`, 13-18), y el hook solo devuelve resultados si coinciden con el texto y el
intento actuales (63-80).

| Momento | Qué pasa | Sin limpieza: qué se ve | Con mi código: qué se ve |
| --- | --- | --- | --- |
| t = 0 ms | Escribe “bor” → se pide `buscarLibros("bor")`, que tarda 1.400 ms. | Indicador de carga (o los resultados anteriores si el código no los limpia). | Indicador de carga: el texto cambió y todavía no hay una `Busqueda` que coincida (63-72). |
| t = 200 ms | Escribe “borges” → se pide `buscarLibros("borges")`, que tarda 300 ms. | Sigue el indicador; hay dos pedidos en vuelo. | Sigue el indicador. La limpieza del efecto de “bor” pone su `activo` en `false` (54-56). |
| t = 500 ms | Llega la respuesta de “borges”. | Se muestran los resultados de “borges”. | Se muestran los resultados de “borges” y `cargando` pasa a `false`, porque la respuesta coincide con el texto y el intento actuales. |
| t = 1.400 ms | Llega la respuesta de “bor”. | **Se muestran los resultados de “bor”**: la respuesta vieja pisa a la nueva. | Sigue viéndose “borges”. La promesa de “bor” ve su `activo = false` y no llama a `setBusqueda` (35-37). |

También se ve el indicador cuando se toca “Reintentar”: `intento` cambia, el estado
guardado queda con otro número y el hook lo considera pendiente hasta que llegue la
respuesta nueva.

#### a) Qué hace la limpieza

Cada ejecución del efecto crea su propia variable `activo = true` (30). La limpieza
`return () => { activo = false; }` (54-56) cierra esa ejecución: cualquier respuesta que
llegue después encuentra `activo === false` y se descarta **antes** de llamar a
`setBusqueda`. La comparación posterior entre `busqueda.texto`/`busqueda.intento` y el
texto/intento actuales (63-64) es una segunda red de seguridad: aunque el estado se
actualizara, solo se muestra si corresponde a la última búsqueda.

La limpieza se ejecuta en dos momentos: (1) justo antes de que el efecto se vuelva a
ejecutar, porque cambió `texto` o `intento`; (2) cuando el componente se desmonta.

#### b) La propuesta del compañero: `if (texto === q)`

No funciona. En un `.then`, `q` no es “el último `q`”: es el valor que capturó la
clausura de la ejecución del efecto que hizo ese pedido. Cada ejecución del efecto tiene
su propio `q` y su propio `texto`, y `texto` es justo el valor con el que se llamó a
`buscarLibros`. Por lo tanto `texto === q` es **siempre verdadero** para la respuesta de
ese pedido, y la respuesta vieja se aplica igual.

La clausura “fotografía” las variables del render en el que se creó la función; no ve los
cambios posteriores. Para que funcionara habría que comparar contra un valor que sí
cambie (un ref actualizado, o el texto actual leído en el momento de la respuesta), y
aun así quedaría el problema de dos respuestas del mismo texto. La bandera de limpieza es
más simple y no depende de comparar strings.

#### c) La URL y el botón atrás

`/buscar` lee `q` con `useLocalSearchParams` y lo escribe con `router.setParams`
(`src/app/buscar.tsx` 14-23). `setParams` modifica los parámetros de la **entrada actual**
del historial:

- La URL se actualiza en cada tecla: `/buscar?q=borges`.
- El botón atrás vuelve a la pantalla anterior (el Catálogo), una sola vez. No hay una
  entrada por letra.
- La búsqueda se puede compartir/recargar: al abrir el link se ve el mismo resultado.
- El CampoTexto es controlado por la URL (`valor={consulta}`), así que el texto y la
  dirección nunca se desincronizan.

Con `router.push` cada tecla apilaría una pantalla nueva de `/buscar`: el botón atrás
tendría que deshacer letra por letra, el stack crecería sin control y la URL terminaría
igual pero con decenas de entradas en el historial.

---

### B3. Mutar o reemplazar

#### a) Tres toques en “Anotarme”

El texto sigue mostrando **0**. `espera.encolar('Ana')` muta el arreglo privado de la
instancia, pero no cambia ninguna referencia que React esté observando: no hay
`setState`, no hay re-render y la pantalla no se vuelve a pintar. El dato cambió en
memoria, pero la interfaz no se enteró.

#### b) Por qué el número “salta” a 3

Cuando la persona escribe en el `TextInput` controlado, el `onChangeText` sí llama a un
`setState`, y eso provoca un render. En ese render se vuelve a leer `espera.tamanio`, que
ahora vale 3 porque las tres mutaciones anteriores sí ocurrieron. El cambio aparece
tarde, “de golpe”, y en un momento que no tiene nada que ver con la acción que lo
produjo.

Un error que aparece “a veces” es peor que uno que aparece siempre porque:

- No se puede reproducir de forma determinista, así que es difícil escribir una prueba
  que lo detecte.
- Depende de un render ajeno (escribir en otro campo, cambiar de pestaña, una
  notificación) y en producción puede no manifestarse durante días.
- Cuando aparece, el estado que muestra la pantalla no es el estado real: ya se tomaron
  decisiones (por ejemplo, “¿está en la cola?”) con datos viejos.

Un error siempre visible se detecta en la primera prueba; uno intermitente se descubre
tarde y genera desconfianza en los datos.

#### c) Cómo lo resolví y qué alternativas hay

En mi Context, la **fuente de verdad es el estado de React** (arreglos) y la clase es el
motor que aplica la operación. Cada mutación reconstruye la estructura desde el arreglo
anterior, la modifica y publica una copia nueva:

```ts
// src/context/BibliotecaContext.tsx, 138-147
const agregarReciente = useCallback((libro: Libro) => {
  setRecientes((previos) => {
    const pila = new Pila<Libro>(previos);
    if (pila.tope?.isbn === libro.isbn) {
      return previos;
    }
    pila.apilar(libro);
    return pila.aArray().slice(0, MAX_RECIENTES);
  });
}, []);
```

```ts
// src/context/BibliotecaContext.tsx, 158-162
const cola = new Cola<string>(esperas[libro.isbn] ?? []);
cola.encolar(NOMBRE_ALUMNO);
const lista = cola.aArray();
setEsperas((previas) => ({ ...previas, [libro.isbn]: lista }));
```

Así, cada `setState` recibe un arreglo nuevo (o el mismo, si no hay cambios) y React
vuelve a renderizar. La clase no se comparte entre renders ni se guarda en un ref: no hay
forma de que la pantalla lea una instancia mutada por atrás.

**Alternativas:**

1. **Solo arreglos** (`[libro, ...recientes]`, `slice`, `filter`): es la más simple y la
   más “React”. Ventaja: no hay que reconstruir nada. Costo: la lógica de la pila/cola
   queda repartida en los componentes y es fácil saltarse la regla (por ejemplo, no
   apilar dos veces el mismo tope). Para este tamaño es perfectamente válida.
2. **Contador de versión / `forceUpdate`** con la instancia viva en un ref: conserva la
   estructura tal cual y evita reconstruirla. Costo: obliga a acordarse de “tocar” el
   contador en cada mutación, todos los consumidores se re-renderizan aunque no usen ese
   dato, y el estado real queda fuera del estado de React (con renderizado concurrente
   se puede leer una instancia a medio mutar). No lo elegí porque el estado mutable
   escondido es justo el problema que hay que evitar.
3. **`useReducer`** con acciones (`agregarReciente`, `reservar`, `desencolar`) y arreglos
   inmutables adentro: centraliza las transiciones y las hace testeables, sin instancias
   mutables. Costo: más ceremonia y un `dispatch` por acción. Es la opción que elegiría
   si la lógica creciera (por ejemplo, si hubiera que deshacer operaciones).

Mi solución tiene el costo de reconstruir la estructura en cada operación (O(n)), pero
las listas tienen 2 o 3 elementos y el beneficio es que el render siempre ve un snapshot
consistente y persistible.

---

### B4. ¿Dónde vive cada dato?

| Dato | Dónde vive en mi app | Por qué ahí y no en otro lugar |
| --- | --- | --- |
| Texto del buscador | **URL**: `useLocalSearchParams` + `router.setParams` (`src/app/buscar.tsx` 14-23) | Es el único dato que conviene poder compartir, recargar y volver a abrir con un link. Si viviera solo en un `useState`, la URL y el campo podrían desincronizarse y el botón atrás no tendría sentido. |
| Préstamos y reservas | **Context** (`BibliotecaContext`, estado `prestamos`) y **AsyncStorage** | Los necesitan el detalle, `/reservas`, el mostrador y el catálogo (para calcular disponibles). Son de toda la app, no de una pantalla, y deben sobrevivir al cierre. |
| Listas de espera | **Context** (estado `esperas`, un `Record<isbn, string[]>`) | Las usa el mostrador (desencolar) y las pantallas de reserva (posición y “personas en espera”); tienen que ser la misma copia. Se persisten con el resto. |
| Vistos recientemente | **Context** (estado `recientes`, serialización de la `Pila`) | Los muestra el Catálogo, pero los escribe el detalle, que está en otra rama del árbol. Una pila local en el Catálogo no vería los pushes hechos desde el detalle. |
| Sesión del personal | **Context** (`sesion: boolean`) | La leen `Stack.Protected` y el link “Personal/Mostrador” del header. No se persiste: cerrar la app cierra la sesión, que es lo esperable para un puesto compartido. |
| Ejemplares disponibles de un libro | **Se calcula**: `libro.ejemplares - préstamos activos` (`BibliotecaContext.tsx` 109-117) | Es un dato derivado. Guardarlo aparte sería duplicar información que puede quedar inconsistente (ver E4d). |
| Estado del permiso de cámara | **Sistema operativo**, leído por `useCameraPermissions` y traducido en `usePermiso` (`src/hooks/usePermiso.ts` 18-79) | El permiso no es un dato de la app: es del sistema. La app solo guarda una copia de lectura para decidir qué mostrar; no tiene sentido persistirlo ni ponerlo en el Context. |
| Identificador de la notificación programada | **Context**, dentro de cada `Prestamo` (`notificacionId`), y **AsyncStorage** | Hay que poder cancelarla cuando se apaga “Recordarme” o se devuelve el libro, incluso después de reiniciar la app (ver D2b). |

**Cuando cambia el `value` del Context, ¿qué se re-renderiza?** Todos los componentes que
consumen `useBiblioteca()`: el layout de Tabs (por la sesión), el Catálogo, el detalle,
`/reservas`, el mostrador y los modales. El `value` está memorizado (`useMemo`,
`BibliotecaContext.tsx` 302-341), pero sus dependencias incluyen `prestamos`, `esperas`,
`recientes`, `avisos` y `sesion`, así que cualquier cambio produce un objeto nuevo y
React no puede saltarse a los consumidores.

**Si el Catálogo solo usa “recientes”, ¿se re-renderiza al activar un recordatorio en
otra pestaña?** Sí: activar el recordatorio modifica `prestamos`, cambia el `value` del
Context y el Catálogo se vuelve a renderizar aunque no lea `prestamos`. En esta app el
costo es bajo (17 filas y un `FlatList`), pero con cientos de filas o hijos pesados se
notaría.

**Cómo evitarlo:** separar el Context en dos (por ejemplo, `PrestamosContext` y
`RecientesContext`) o usar un store con selectores (`useSyncExternalStore`, Zustand) para
que cada componente se suscriba solo a la porción que usa. También ayudaría envolver las
filas en `React.memo`, aunque el `FlatList` padre seguiría re-renderizándose. En una app
de este tamaño no vale la pena: la legibilidad de un solo Context pesa más que el costo
de unos pocos renders.

---

## Parte C · Navegación y rutas

### C1. La pila en mi app

Recordemos la estructura: el **Stack raíz** (`src/app/_layout.tsx` 47-88) contiene
`(tabs)` como ancla y, encima, las pantallas y modales. Adentro de `(tabs)` hay un
navegador de **Tabs** con Catálogo y Mis reservas.

| # | Acción | Pilas resultantes |
| --- | --- | --- |
| 1 | Abre la app. | Stack raíz: `[(tabs)]`, tab activa **Catálogo**. Tabs: `[Catálogo]`. |
| 2 | Toca un libro del Catálogo. | Stack raíz: `[(tabs), libro/9788437604947]`. Tabs: `[Catálogo]` (el detalle está arriba, en el Stack raíz; la barra de pestañas queda tapada). |
| 3 | Toca “Reservar”. | Stack raíz: `[(tabs), libro/9788437604947, reservar/9788437604947 (modal)]`. Tabs: `[Catálogo]`. |
| 4 | Toca “Confirmar”. | Stack raíz: `[(tabs)]`, tab activa **Mis reservas**. Tabs: `[Catálogo, Mis reservas]` (historial de pestañas). |
| 5 | Toca atrás (Android). | Stack raíz: `[(tabs)]`, tab activa **Catálogo**. Tabs: `[Catálogo]`. El primer atrás en una pestaña que no es la inicial vuelve a la primera; un segundo atrás sale de la app. |
| 6 | Toca la tab “Catálogo”. | Stack raíz: `[(tabs)]`, tab activa **Catálogo**. Se ve la lista del catálogo (no el detalle): el detalle se cerró en el paso 4. |

#### a) Qué usé en el paso 4

En `src/app/reservar/[isbn].tsx` (línea 59) uso:

```ts
router.dismissTo('/reservas');
```

`dismissTo` descarta las pantallas que están por encima de `/reservas` y deja esa ruta
como destino: cierra el modal **y** el detalle (que quedó debajo) y selecciona la
pestaña “Mis reservas”. La pila queda limpia.

- Con **`push`**: se agregaría una pantalla de `/reservas` encima del modal. El botón
  atrás volvería a la confirmación (y el modal seguiría en el historial), justo lo que la
  consigna prohíbe. Además, la ruta quedaría como pantalla del Stack raíz, sin la barra
  de pestañas.
- Con **`replace`**: se reemplazaría el modal por `/reservas` en el Stack raíz. La
  pestaña seguiría siendo Catálogo y `/reservas` quedaría como una pantalla suelta arriba
  de las pestañas; atrás volvería al detalle, y la barra de pestañas no estaría visible.
- Con **`dismissTo`**: se descarta la confirmación y se llega a la ruta “real” de la
  pestaña, que es la que tiene la barra de pestañas y el estado de la app.

#### b) Paso 6: ¿Catálogo o detalle?

Ve el **Catálogo**, por dos motivos:

1. En el paso 4, `dismissTo` ya cerró el detalle junto con el modal. No queda un detalle
   en la pila.
2. La pestaña “Catálogo” conserva montada su pantalla y su listado; al tocarla se vuelve
   a mostrar sin recargar.

Me parece el comportamiento correcto para esta app: confirmar una reserva es una acción
que termina el flujo (la persona ya está en “Mis reservas”); volver al detalle de un libro
que ya reservó no aporta nada y permitiría reabrir la confirmación. Si se quisiera
conservar el detalle, habría que usar `push`/`replace`, pero entonces el atrás volvería a
la confirmación, que es peor.

---

### C2. El escáner que dispara de más

#### a) Sin protección

`onBarcodeScanned` puede emitir muchas veces por segundo mientras el código está frente a
la cámara. Cada llamada haría `router.push('/libro/...')` y agregaría una entrada a la
cola de acciones de navegación (la misma idea del TP 2): la cola procesa **todas** las
acciones, no descarta las repetidas. El resultado sería una pila con decenas de copias del
mismo detalle: memoria de más, transiciones encadenadas, un botón atrás que hay que tocar
muchas veces y, en el peor caso, advertencias del navegador por demasiadas pantallas.

#### b) `useRef`, no `useState`

Usé `const navegando = useRef(false)` (`src/app/escanear.tsx` 18) y lo consulto/escribo
en `procesar` (24-26, 44).

Un `useState` en `true` en el primer escaneo **no alcanza** porque el valor que lee el
callback es el de la clausura del render que creó el handler: cuando llegan los escaneos
siguientes del mismo frame, todavía “ven” `false` (el `setState` es asíncrono y recién
provoca un render después). Con un ref, `.current` se modifica en el acto y el próximo
llamado, aunque sea en el mismo frame, ya lo ve en `true`.

#### c) Por qué `replace` para ir al detalle

`router.replace(\`/libro/${isbn}\`)` (`escanear.tsx` 46) sustituye la pantalla del
escáner por el detalle. Al tocar atrás se vuelve al Catálogo, que es el lugar desde donde
se entró.

Con `push`, atrás volvería al escáner: la cámara seguiría activa y el `ref` ya estaría en
`true`, así que el escáner quedaría “muerto” hasta remontarlo, además de tener una
pantalla intermedia que ya cumplió su función.

#### d) ISBN que no está en el catálogo

`procesar` limpia el código y valida 13 dígitos (`escanear.tsx` 27-31). Si el ISBN no
existe (32-43):

- Muestra un mensaje claro con el ISBN leído y no navega.
- No pone `navegando` en `true`, así que se puede seguir escaneando.
- Guarda el último código avisado con la hora en `ultimoAviso` y, si el mismo código
  vuelve a aparecer dentro de 3 segundos, lo ignora sin volver a mostrar el mensaje. Un
  código distinto se procesa normalmente.
- La entrada manual del ISBN sigue disponible siempre.

---

### C3. Deep links y rutas protegidas

| Link | Qué ve la persona | Qué queda debajo en la pila | Qué parte del código lo decide |
| --- | --- | --- | --- |
| `bibliotecaipf://libro/9788437604947` | El detalle del libro, con el título en el header, ejemplares, espera y “Reservar”. | `(tabs)` con el Catálogo (por el ancla). | `src/app/_layout.tsx` 9-11 (`anchor: '(tabs)'`) y la ruta `libro/[isbn].tsx`. |
| `bibliotecaipf://libro/123` | La pantalla de detalle con “No encontramos ese libro / El código tiene que tener 13 dígitos” y un botón para volver. | `(tabs)` con el Catálogo. | `src/app/libro/[isbn].tsx` 21 y 29-44 (`esIsbn` + `buscarLibro`). |
| `bibliotecaipf://buscar?q=borges` | Los resultados de Borges, con el campo ya completo. | `(tabs)` con el Catálogo. | `buscar.tsx` 14-23 (lee `q`) y `useBusqueda`. |
| `bibliotecaipf://mostrador` (sin sesión) | Vuelve al **Catálogo** (con el link “Personal” en el header). | `(tabs)`. | `Stack.Protected guard={sesion}` en `_layout.tsx` 84-86: la ruta no existe hasta iniciar sesión, así que el navegador vuelve al ancla. |
| `bibliotecaipf://reserva` | La pestaña “Mis reservas”. | `(tabs)` con el Catálogo como ancla. | `src/app/reserva.tsx` (`<Redirect href="/reservas" />`). |
| `bibliotecaipf://escanear` (cámara bloqueada) | El escáner con el aviso “La cámara está bloqueada”, el botón “Revisar permiso” y el formulario para escribir el ISBN. | `(tabs)` con el Catálogo. | `escanear.tsx` 64-84 (ramas de `estado`) y `permisos/[recurso].tsx`. |

**¿Por qué `/libro/123` llega al detalle aunque el libro no exista?** Porque Expo Router
resuelve la URL contra el **árbol de archivos**, no contra los datos: `libro/[isbn].tsx`
existe para cualquier segmento, y el parámetro llega como string. El router no sabe (ni
debería) si ese ISBN está en el catálogo.

La responsabilidad es compartida: el router entrega la ruta y la pantalla valida los
datos antes de mostrarlos. En mi app, el detalle valida formato y existencia y muestra un
mensaje con salida (29-44). En un sistema real, además el backend respondería 404 y la
pantalla traduciría ese caso a un mensaje para la persona, nunca al texto técnico.

---

### C4. Foco, montaje y primer plano

#### a) Qué detecta cada herramienta

- **`useEffect` con `[]`**: el montaje de la pantalla (y su desmontaje en la limpieza).
  No se vuelve a ejecutar cuando la pantalla se oculta o se muestra de nuevo, ni cuando
  la app pasa a segundo plano.
- **`useFocusEffect`**: cada vez que la pantalla **gana el foco** (al montarse y cada vez
  que se vuelve a ella desde otra pantalla o pestaña), y ejecuta la limpieza al perderlo.
- **`AppState`**: los cambios de estado de la app (`active`, `background`,
  `inactive`). Detecta cuando la persona sale a otra app y vuelve, sin importar qué
  pantalla está enfocada.

#### b) Los dos escenarios

- **Sale a Ajustes, habilita las notificaciones y vuelve**: se entera **`AppState`**. La
  pantalla nunca perdió el foco (la app quedó en segundo plano, pero la pantalla seguía
  montada y enfocada), así que `useFocusEffect` no se ejecuta. `useEffect []` tampoco.
- **Va a la pestaña Catálogo y vuelve a “Mis reservas”**: se entera
  **`useFocusEffect`**. La app nunca dejó de estar activa, así que `AppState` no emite
  ningún cambio; `useEffect []` ya se había ejecutado en el montaje y no vuelve.

#### c) Qué usé y qué pasaría con una sola

En `src/app/(tabs)/reservas.tsx` uso **las dos**, con roles distintos:

- `useFocusEffect` (39-43) vuelve a consultar el permiso cada vez que la pestaña gana el
  foco. Sirve, por ejemplo, si el permiso se cambió desde `/permisos/notificaciones` o si
  la pestaña estuvo oculta mientras cambiaba.
- `usePermiso` escucha `AppState` (`usePermiso.ts` 48-57) y llama a `consultar()` cuando
  la app vuelve a `active`. Eso cubre la vuelta de los Ajustes del sistema.

Si usara **solo** `useFocusEffect`, la pantalla mostraría un estado viejo al volver de
Ajustes: el permiso estaría concedido en el sistema pero la tarjeta seguiría diciendo
“bloqueadas” (y el botón “Revisar permiso”) hasta cambiar de pestaña y volver. Si usara
**solo** `AppState`, al cambiar de pestaña después de modificar el permiso desde la
pantalla de permisos la tarjeta podría quedar desactualizada hasta que la app pase a
segundo plano y vuelva.

---

## Parte D · Permisos en tu app

### D1. Recorrido completo de la cámara (Android 14, app recién instalada)

La app nunca abre el diálogo del sistema sola: primero muestra la tarjeta de
`/escanear`, después la pantalla previa `/permisos/camara` y recién ahí el botón
“Continuar” llama a `pedir()`.

| # | Acción | Qué muestra tu app | `status` | `canAskAgain` |
| --- | --- | --- | --- | --- |
| 1 | Toca “Escanear” por primera vez. | `/escanear` con la tarjeta “Necesitamos tu cámara”, el texto de propósito y el botón “Habilitar cámara”; abajo, el formulario para escribir el ISBN. | `undetermined` | `true` |
| 2 | “Habilitar cámara” → “Continuar” → “No permitir”. | Vuelve a `/permisos/camara`, que ahora muestra el texto de “al continuar vas a ver el diálogo…” y el botón **Continuar** otra vez. No navega. | `denied` | `true` |
| 3 | Toca “Escanear” otra vez. | `/escanear` con la misma tarjeta (sigue siendo preguntable) y el ISBN manual disponible. “Habilitar cámara” → `/permisos/camara` → “Continuar”. | `denied` | `true` |
| 4 | “Continuar” → “No permitir”. | `/permisos/camara` cambia a “El permiso está bloqueado…” y el botón pasa a **Abrir Ajustes**. | `denied` | `false` |
| 5 | Toca “Escanear” otra vez. | `/escanear` muestra “La cámara está bloqueada”, el botón “Revisar permiso” y el formulario manual. La app sigue usable. | `denied` | `false` |
| 6 | “Abrir Ajustes” → habilita la cámara → vuelve a la app. | Al volver, el listener de `AppState` reconsulta: la pantalla pasa a “Permiso concedido” y el botón **Continuar** vuelve a `/escanear`, que ya muestra la cámara. | `granted` | `true` (irrelevante) |

#### a) El mismo recorrido en iOS

Cambia en el **paso 3**: en iOS el diálogo del sistema se muestra **una sola vez**. Después
del primer “No permitir”, `canAskAgain` ya es `false`, así que en el paso 2 la app pasa
directo a “El permiso está bloqueado” con **Abrir Ajustes** (no vuelve a ofrecer
“Continuar” para pedir de nuevo). El paso 4 no existe como diálogo: ya está bloqueado.

#### b) La línea que decide entre “Continuar” y “Abrir Ajustes”

En `src/app/permisos/[recurso].tsx` (93-101):

```tsx
{estado === 'bloqueado' ? (
  <Boton titulo="Abrir Ajustes" onPress={abrirAjustes} />
) : (
  <Boton titulo="Continuar" ... onPress={() => void continuar()} />
)}
```

El campo que decide es **`canAskAgain`**, traducido a `estado` en
`src/lib/permisos.ts` (5-15):

```ts
if (permiso.granted) return 'concedido';
return permiso.canAskAgain ? 'preguntable' : 'bloqueado';
```

No alcanza con mirar `status` porque `denied` significa dos cosas distintas: “denegado,
pero puedo volver a preguntar” (`canAskAgain: true`) y “denegado definitivamente”
(`canAskAgain: false`). Además `undetermined` también es preguntable, y en iOS
`granted` puede ser `false` con un estado `PROVISIONAL` que sí permite notificaciones.
`status` dice qué pasó; `canAskAgain` dice qué puedo hacer al respecto.

#### c) Qué se entera de que la persona volvió de Ajustes

El listener de `AppState` en `usePermiso` (48-57): cuando el estado pasa a `active`
después de haber estado en `background`, llama a `consultar()` (24-31), que vuelve a leer
`getCameraPermissionsAsync()` (o `getNotificationsPermissionsAsync`) y actualiza el
estado.

Si esa parte no existiera, al volver de Ajustes la pantalla seguiría mostrando
“bloqueado” y **Abrir Ajustes**, y `/escanear` seguiría sin montar la `CameraView` aunque
el permiso ya estuviera concedido. Recién se actualizaría al remontar la pantalla
(cambiando de pestaña o reiniciando la app), lo que parece un bug para la persona.

---

### D2. Notificaciones y consistencia

#### a) Activar “Recordarme” y devolver antes de los 15 segundos

Si no se cancelara, la notificación se dispararía igual a los 15 segundos con un
recordatorio de devolución de un libro que ya se devolvió: información falsa y una
notificación que la persona no puede asociar con nada. Por eso `devolver`
(`BibliotecaContext.tsx` 167-176) cancela el `notificacionId` antes de quitar el préstamo,
y apagar el interruptor también lo cancela (188-201).

#### b) Dónde guardo el identificador y qué pasa si la app se cierra

`scheduleNotificationAsync` devuelve un id; lo guardo en el préstamo
(`Prestamo.notificacionId`, `src/types/index.ts`) dentro del Context y se persiste en
AsyncStorage junto con el resto del estado (`src/lib/persistencia.ts`).

Si la app se cierra antes de que llegue:

- **La notificación**: el sistema operativo ya la tiene programada. En Android,
  `expo-notifications` declara `RECEIVE_BOOT_COMPLETED` y reprograma los avisos al
  reiniciar; en iOS también sobrevive al cierre de la app. La notificación se entrega
  aunque la app esté cerrada (el handler de `lib/notificaciones.ts` 15-22 decide cómo
  mostrarla cuando está abierta).
- **El identificador**: está persistido, así que la app puede cancelarla en el próximo
  arranque.

El problema aparece en los bordes:

1. El guardado en AsyncStorage es asincrónico: si la app muere justo entre programar y
   escribir, queda una notificación viva sin id guardado (no se puede cancelar y el
   préstamo tampoco quedó guardado).
2. Si se borran los datos de la app o se reinstala, los ids guardados ya no existen: el
   interruptor puede quedar en “activo” sin recordatorio real, o quedar una notificación
   huérfana.
3. Algunos sistemas matan los temporizadores exactos por batería o al reiniciar, según el
   fabricante.

Cómo lo resolvería: al iniciar, reconciliar el estado con
`getAllScheduledNotificationsAsync()` (cancelar las que no tengan un préstamo activo y
marcar como inactivas las que no existan), guardar el estado inmediatamente después de
programar (antes de considerarlo confirmado) y, en producción, usar el backend para
recordatorios críticos en lugar de depender solo del dispositivo.

#### c) Por qué el canal se crea antes de pedir en Android 13+

En Android 13 (API 33) las notificaciones son un permiso en tiempo de ejecución
(`POST_NOTIFICATIONS`): el diálogo lo controla el sistema y la app no puede mostrarlo si
el permiso no está concedido. El **canal** (`prestamos`) es otra cosa: es la categoría con
la que Android agrupa y configura las notificaciones (importancia, sonido, vibración) y es
obligatorio desde Android 8 para publicar. Se crea **antes** de pedir por dos motivos:
para que la notificación tenga un canal válido apenas se conceda el permiso (si se publica
sin canal, Android la descarta), y para que la persona pueda configurar ese canal en los
Ajustes desde el primer momento. Crear el canal no muestra ningún diálogo.

En Android 12 o inferior no existe el permiso en tiempo de ejecución: las notificaciones
están permitidas por defecto (la persona las apaga desde los Ajustes) y
`requestPermissionsAsync` resuelve concedido sin diálogo. El canal sigue siendo
obligatorio, así que el orden no cambia; lo que cambia es que no hay paso de permiso.

#### d) Permiso denegado y entrega desde el mostrador

`entregarSiguiente` (`BibliotecaContext.tsx` 241-279) llama a
`avisarReservaListaAsync` (267), que consulta el permiso **en ese momento**
(`lib/notificaciones.ts` 75-78):

```ts
const permiso = await getPermissionsAsync();
if (!permiso.granted) {
  return false;
}
```

Si devuelve `false`, el Context agrega un aviso a `/reservas` (268-275):

```ts
if (!notificado) {
  setAvisos((previos) => [
    crearAviso(`Tu reserva de “${libro.titulo}” está lista para retirar en el mostrador.`),
    ...previos,
  ]);
}
```

Consulta el permiso en el momento y **no** un valor guardado porque el permiso puede
haber cambiado desde que se abrió la app (la persona pudo habilitarlo o bloquearlo en
Ajustes). Si usara un valor cacheado, podría intentar notificar sin permiso (y perder el
aviso) o mostrar el aviso dentro de la app cuando en realidad la notificación sí se podía
mostrar. El costo es una lectura asincrónica por entrega, que es despreciable frente a la
posibilidad de avisar mal.

---

### D3. Lo que tu app pide y lo que no

| Plataforma | Permiso o clave declarada | Función de la app que lo justifica | ¿Quién lo agrega? |
| --- | --- | --- | --- |
| Android | `android.permission.CAMERA` | Leer el EAN-13 de la contratapa en `/escanear`. | Plugin de `expo-camera` (y su manifiesto). |
| Android | `android.permission.POST_NOTIFICATIONS` (runtime, 13+) | Recordatorio de devolución al activar “Recordarme”. | Manifiesto de `expo-notifications`. |
| Android | `android.permission.RECEIVE_BOOT_COMPLETED` | Reprogramar/entregar las notificaciones locales después de reiniciar el teléfono. | Manifiesto de `expo-notifications`. |
| Android | `android.permission.INTERNET` | Cargar la app y la API simulada; también lo necesita el desarrollo. | Base de Expo/React Native. |
| iOS | `NSCameraUsageDescription` | Texto de propósito de la cámara: “Usamos tu cámara para leer el código de barras del libro y abrir su ficha sin que escribas el ISBN.” | Plugin de `expo-camera` (`cameraPermission`). |
| iOS | Permiso de notificaciones (sin clave en Info.plist) | Recordatorio de devolución. El sistema lo pide en tiempo de ejecución. | `expo-notifications` (UNUserNotificationCenter). |
| iOS | `CFBundleURLSchemes` con `bibliotecaipf` | Deep links a las rutas de la app. | Configuración `scheme` de `app.json`. |
| — | Sin `NSMicrophoneUsageDescription`, sin `RECORD_AUDIO`, sin ubicación, sin almacenamiento | La app no graba audio ni usa ubicación ni galería. | `microphonePermission: false`, `recordAudioAndroid: false` y `blockedPermissions`. |

#### a) Por qué no declara `RECORD_AUDIO` aunque usa `expo-camera`

El plugin de `expo-camera` declara `RECORD_AUDIO` por defecto porque el mismo componente
sirve para grabar video con audio. Esta app solo escanea códigos, así que se desactiva
explícitamente en `app.json`:

```json
[
  "expo-camera",
  {
    "cameraPermission": "Usamos tu cámara para leer el código de barras del libro y abrir su ficha sin que escribas el ISBN.",
    "microphonePermission": false,
    "recordAudioAndroid": false,
    "barcodeScannerEnabled": true
  }
]
```

`recordAudioAndroid: false` hace que el plugin **no** agregue `RECORD_AUDIO` al
manifiesto (verificado en `node_modules/expo-camera/plugin/build/withCamera.js`: el
permiso se agrega condicionado a esa opción) y `microphonePermission: false` evita que se
agregue `NSMicrophoneUsageDescription` en iOS. Además, el bloqueo a nivel manifiesto está
reforzado con `blockedPermissions` (`RECORD_AUDIO` incluido), por si otra dependencia lo
intentara agregar.

#### b) “Elegir una foto de portada desde la galería”

Usaría **`expo-image-picker`** (no `expo-media-library`, que da acceso amplio a la
galería). En iOS hace falta `NSPhotoLibraryUsageDescription` con el texto de propósito
(el plugin la agrega con la opción `photosPermission`). En Android 13+ el selector de
fotos del sistema no requiere permiso de almacenamiento; en versiones anteriores el
plugin puede agregar `READ_EXTERNAL_STORAGE` según la configuración.

**No alcanza con una actualización OTA**: instalar un módulo nativo y declarar permisos
nuevos cambia el binario (código nativo, manifiesto de Android e Info.plist de iOS), y las
actualizaciones OTA de EAS Update solo pueden cambiar el JavaScript y los assets. Hay que
hacer una **build nueva** (development build o build de producción). En Expo Go se puede
probar mientras tanto porque el módulo ya viene incluido en la app de Expo Go.

#### c) Qué no se pudo verificar del todo en Expo Go

- **El texto de propósito**: en Android 14 el diálogo de cámara no muestra texto propio
  (Android no lo admite; el texto es de iOS); en iOS, Expo Go muestra su propio mensaje,
  no el de `app.json`. Se verifica con una development build.
- **El canal `prestamos`**: Expo Go tiene su propia app y sus propios canales; el nombre,
  la importancia y el color de `expo-notifications` configurados en `app.json` solo se
  aplican en una build propia.
- **“Abrir Ajustes”**: `Linking.openSettings()` en Expo Go abre los Ajustes de **Expo
  Go**, no los de Biblioteca IPF. En una build propia abre la ficha correcta.
- **El ícono/color de la notificación** (`color`, `defaultChannel`) y el comportamiento
  exacto del permiso en Android 13+ dependen del binario.

Se verifican con `npx expo run:android`, `npx expo run:ios` o una development build de
EAS, y revisando el manifiesto final (`adb shell dumpsys package <paquete>`) y el
Info.plist generado.

---

## Parte E · Buenas prácticas y decisiones de diseño

### E1. Revisión de código

#### a) Problemas del fragmento

| Línea | Problema | Clasificación | Por qué y cómo corregirlo |
| --- | --- | --- | --- |
| 13-16 | Pide cámara y notificaciones al montar, sin que la persona haya hecho nada. | Mala práctica (UX y mínimo privilegio) + advertencia | Las tiendas exigen pedir en contexto, justo cuando se usa la función (Apple 5.1.1; política de permisos de Google). Además `requestPermissionsAsync()` se llama sin `await` ni `catch`. Se corrige pidiendo solo al entrar al escáner (pantalla previa) y al activar “Recordarme”. |
| 14 | `pedirPermiso()` se ejecuta en cada montaje, sin mirar el estado actual. | Mala práctica | Si ya está concedido, no hay que pedir de nuevo; si está bloqueado, el diálogo no aparece y la app no lo explica. Hay que leer `status` y `canAskAgain` antes de decidir. |
| 18-20 | `useEffect` sin array de dependencias. | **Error de ejecución** | Se ejecuta después de cada render; `setLibros` con un arreglo nuevo provoca otro render → bucle infinito de pedidos (ver b). Se corrige con `[intento]` (o `[]` si no hay reintento) y limpieza. |
| 19 | `.then` sin `.catch` ni limpieza. | Advertencia | Una promesa rechazada (la API falla 1 de 5 veces) queda sin manejar y no se muestra nada; si la pantalla se desmonta, el `setLibros` se ejecuta igual. Falta `activo`/bandera y mensaje de error. |
| 10 | `useState<any[]>` y `any` en las props de `Fila`. | Mala práctica (TypeScript) | Se pierde el tipado y no hay error si falta un campo. Usar `Libro` de `src/types`. |
| 22-30 | `Fila` declarada **dentro** de `Catalogo`. | Mala práctica + rendimiento | En cada render se crea un tipo de componente nuevo, así que React desmonta y vuelve a montar todas las filas (se pierde el estado de cada una y se recrean las vistas). Debe ir a nivel de módulo, en su propio archivo. |
| 35 | `key={i}`. | Mala práctica | La clave por índice cambia si se agrega/quita un libro: React reutiliza la fila equivocada. Usar `key={libro.isbn}`. |
| 33-36 | `ScrollView` con `map`. | Rendimiento | Renderiza todas las filas de una vez, sin virtualización. `FlatList` con `keyExtractor` estable y `ListEmptyComponent`. |
| 25 | Estilos en línea y colores/tamaños hardcodeados. | Mala práctica | No hay tema único; no se puede cambiar el color en un lugar. `StyleSheet.create` + `src/constants/tema.ts`. |
| 37-39 | Botón solo con ícono, sin `accessibilityRole` ni `accessibilityLabel`, área táctil de 28 px. | Mala práctica (accesibilidad) | Un lector de pantalla no sabe qué hace y el área táctil es menor a 44 × 44. Agregar rol, etiqueta y tamaño mínimo. |
| 9-42 | No hay estados de carga, error ni vacío, ni forma de reintentar. | Mala práctica (estados de pantalla) | La persona ve una pantalla vacía indefinidamente si falla. Usar `useLibros` con sus cuatro estados. |
| 24 | Concatena el ISBN sin validar. | Advertencia | Si `libro.isbn` viniera vacío, navega a `/libro/`; el detalle debe validar (y la lista debería tener datos completos). |

#### b) El efecto de las líneas 18-20 sin array de dependencias

1. Primer render: la lista está vacía y el efecto se ejecuta después del render; lanza
   `obtenerLibros()` (800 ms).
2. Llega la respuesta, `setLibros(datos)` con un **arreglo nuevo** (la API hace
   `LIBROS.map(...)`) → React vuelve a renderizar.
3. Al terminar ese render, el efecto se ejecuta otra vez (no tiene dependencias) y lanza
   otro pedido. Llega a los 800 ms → otro `setLibros` → otro render → otro pedido…

Durante el primer minuto: aproximadamente **75 pedidos** (60.000 ms / 800 ms), cada uno
con su render, su promesa y su red. Como la API falla 1 de 5 veces, además aparecen
promesas rechazadas sin manejar. La app queda en un ciclo de trabajo permanente (batería,
red, CPU), el indicador de carga nunca se puede estabilizar y las respuestas pueden llegar
desordenadas.

**Si `obtenerLibros()` devolviera siempre el mismo array**, el bucle se cortaría: React
compara con `Object.is` y, al recibir la misma referencia que ya está en el estado,
“baila” el `setState` sin volver a renderizar. Sin render nuevo, el efecto no se vuelve a
ejecutar y queda un solo pedido. Es una curiosidad útil, pero no es una solución: la app
seguiría sin manejar el error ni la limpieza, y cualquier cambio real (un libro nuevo)
rompería la igualdad.

#### c) La pantalla reescrita

Así queda el Catálogo con los hooks, componentes y constantes de la app
(`src/app/(tabs)/index.tsx`):

```tsx
import { router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { EncabezadoCatalogo } from '@/components/EncabezadoCatalogo';
import { FilaLibro } from '@/components/FilaLibro';
import { MensajeEstado } from '@/components/MensajeEstado';
import { PantallaCargando } from '@/components/PantallaCargando';
import { colores, espaciado } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { useLibros } from '@/hooks/useLibros';
import type { Libro } from '@/types';

export default function Catalogo() {
  const { libros, cargando, error, reintentar } = useLibros();
  const { recientes, disponibles } = useBiblioteca();

  const abrirLibro = useCallback((libro: Libro) => {
    router.push(`/libro/${libro.isbn}`);
  }, []);

  if (cargando) {
    return <PantallaCargando mensaje="Cargando el catálogo…" />;
  }

  if (error) {
    return (
      <MensajeEstado
        titulo="No pudimos cargar el catálogo"
        descripcion={error}
        accion={{ titulo: 'Reintentar', onPress: reintentar }}
      />
    );
  }

  return (
    <FlatList
      data={libros}
      keyExtractor={(libro) => libro.isbn}
      renderItem={({ item }) => (
        <FilaLibro
          libro={item}
          disponibles={disponibles(item)}
          onPress={() => abrirLibro(item)}
        />
      )}
      ListHeaderComponent={
        <EncabezadoCatalogo
          recientes={recientes}
          onAbrirReciente={abrirLibro}
          onBuscar={() => router.push('/buscar')}
          onEscanear={() => router.push('/escanear')}
        />
      }
      ListEmptyComponent={
        <MensajeEstado
          titulo="La biblioteca está vacía"
          descripcion="Todavía no hay libros cargados. Volvé a intentarlo más tarde."
        />
      }
      contentContainerStyle={estilos.contenido}
      style={estilos.lista}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { backgroundColor: colores.fondo },
  contenido: { flexGrow: 1, paddingBottom: espaciado.xl },
});
```

Cambios frente al fragmento original:

- El pedido y sus estados salen del componente y viven en `useLibros` (con limpieza y
  reintento).
- Los permisos ya no se piden al abrir el catálogo.
- `FlatList` con clave ISBN, encabezado y estado vacío.
- `FilaLibro` es un componente de módulo, con estilos del tema y accesibilidad.
- Los accesos a Buscar/Escanear y los “Vistos recientemente” están en
  `EncabezadoCatalogo` / `SeccionRecientes`.
- `StyleSheet.create` + `constants/tema.ts`; sin `any`.

#### d) Qué problema provoca el rechazo en una tienda y cuál la desinstalación

- **Rechazo en la tienda**: pedir cámara y notificaciones en el arranque, sin contexto ni
  texto de propósito. Apple (5.1.1) y Google rechazan permisos que no son claramente
  necesarios en el momento en que se piden, y las notificaciones sin un flujo que las
  justifique son un caso típico de rechazo. También contribuye no crear el canal de Android
  antes de notificar.
- **Desinstalación**: el bucle infinito de pedidos (líneas 18-20). La app queda
  permanentemente cargando, consume batería y datos y nunca termina de mostrar la lista;
  en un teléfono real eso se nota en minutos y es lo primero que hace que alguien la
  borre. Los diálogos de permiso al abrir, en segundo lugar, también empujan a
  desinstalar, pero el bucle es el que hace la app inutilizable.

---

### E2. Organización y acoplamiento

#### a) Qué carpetas importan a cuáles

```
app/          → components, hooks, context, lib, constants, types
components/   → components (Boton, etc.), constants, lib (fechas), types
context/      → constants, data, estructuras, lib, types
hooks/        → lib, types
lib/          → constants, data, types
data/         → types
constants/    → (nada)
estructuras/  → (nada)
types/        → (nada)
```

Las flechas van siempre “hacia abajo”: la UI (app, components) depende de la lógica
(hooks, context, lib), la lógica depende de los datos y los tipos, y el fondo
(estructuras, types, constants) no depende de nadie. **No hay ninguna importación hacia
arriba**: ningún hook, lib o contexto importa algo de `src/app` (lo verifiqué con
`grep -r "from '@/app" src`, sin resultados).

Sería un problema porque:

- Crea dependencias circulares: un hook que importa una pantalla y una pantalla que
  importa el hook. Metro puede resolverlo mal o dejar valores `undefined` en el arranque.
- Rompe la separación: la lógica deja de ser reutilizable y testeable sin montar la app.
- Arrastra UI (y sus dependencias nativas) al bundle de la lógica, y hace que un cambio de
  diseño obligue a tocar archivos de datos.

#### b) Si el catálogo pasara a una API real

Cambiarían:

1. `src/lib/api.ts`: reemplazar la simulación por `fetch` a los endpoints reales
   (manteniendo `obtenerLibros` y `buscarLibros` con la misma firma).
2. `src/data/libros.ts`: se eliminaría (o quedaría solo como datos de prueba); las listas
   de espera iniciales vendrían del servidor.
3. `src/types/index.ts`: solo si la respuesta real tiene otra forma (por ejemplo, un `id`
   interno o paginación).

Los hooks (`useLibros`, `useBusqueda`), las pantallas y los componentes no cambian: no
saben de dónde vienen los datos. Que sean dos o tres archivos (y ninguno de UI) es una
señal de que el acoplamiento es bajo y la capa de datos está bien aislada. Si hubiera que
tocar diez archivos, significaría que la forma de obtener datos está filtrada en la UI.

#### c) El componente `<ConPermiso recurso="camara">`

**Ganaría**: encapsular los cuatro estados y la pantalla previa en un solo lugar;
cualquier pantalla que necesite la cámara escribiría `<ConPermiso recurso="camara">` y se
olvidaría del resto; también sería más fácil testear el flujo una vez.

**Perdería**: control sobre el momento del pedido. La consigna exige que el diálogo del
sistema se muestre **después** de la pantalla previa y con una acción explícita de la
persona; un wrapper que pide el permiso al montarse rompería eso. Además, cada recurso
tiene una salida distinta (el escáner puede seguir con el ISBN a mano; las notificaciones
se activan desde un interruptor, no desde una pantalla) y los textos cambian. Un wrapper
genérico terminaría con muchas props (`beneficio`, `mensajeBloqueado`, `onConcedido`,
`pedirAlMontar`…) y sería más difícil de leer que la pantalla actual.

**Para las notificaciones no serviría**: no se piden al abrir una pantalla, se piden al
activar “Recordarme” en un préstamo. El wrapper tendría que exponer una función para
“pedir cuando yo quiera”, con lo cual se convertiría en el hook que ya tengo. Me quedaría
con `usePermiso` para la lógica y la pantalla `/permisos/[recurso]` para la explicación.

---

### E3. Mapa de fallas

| Situación | Qué ve la persona | Dónde se maneja |
| --- | --- | --- |
| `obtenerLibros()` falla | “No pudimos cargar el catálogo” + el detalle en lenguaje claro + botón **Reintentar**. | `useLibros.ts` 30-38 (mensaje, sin el error técnico) y `(tabs)/index.tsx` 26-34 (pantalla con acción). |
| Se abre `/libro/abc` | “No encontramos ese libro / El código del libro tiene que tener 13 dígitos” + botón **Volver al catálogo**. | `libro/[isbn].tsx` 21 y 29-44 (`esIsbn` y `buscarLibro`). |
| Se escanea un ISBN que no está en el catálogo | “No encontramos un libro con el ISBN … Podés seguir escaneando o escribirlo a mano”; no navega. | `escanear.tsx` 32-43 (`procesar`). |
| La cámara está bloqueada | “La cámara está bloqueada”, botón **Revisar permiso** y el formulario de ISBN siempre disponible. | `escanear.tsx` 64-84 y `permisos/[recurso].tsx` 86-101. |
| Las notificaciones están denegadas | La tarjeta con “Las notificaciones están desactivadas” (y la indicación de activar “Recordarme”) o “bloqueadas en el sistema” con el botón **Revisar permiso**. Al intentar activar el recordatorio, un mensaje y un aviso dentro de `/reservas`. | `(tabs)/reservas.tsx` 17-22 y 56-65; `BibliotecaContext.tsx` 203-222. |
| Se intenta reservar un libro ya reservado | En el detalle, en lugar del botón aparece “Ya estás en la lista de espera, en el puesto N” o “Ya tenés este libro en préstamo”. En el modal, “Confirmar” está deshabilitado y hay un mensaje. | `libro/[isbn].tsx` 70-83; `reservar/[isbn].tsx` 36, 46-60 y 81-91; `BibliotecaContext.tsx` 151-153 (segunda validación). |
| “Entregar al siguiente” con la lista vacía | El botón no se muestra porque el mostrador solo lista libros con espera; si igual se llamara, la función devuelve `null` y la pantalla muestra “Esa lista de espera ya está vacía”. | `mostrador.tsx` 17-20 y 26-29; `BibliotecaContext.tsx` 243-246. |
| Login con clave incorrecta | “El usuario o la clave no son correctos. Volvé a intentarlo.” | `login.tsx` 19-25 y 53. |

Ninguna de estas situaciones deja la app trabada: todas tienen un mensaje y una salida
(reintentar, volver, escribir a mano, revisar el permiso).

---

### E4. Decisiones con argumentos

#### a) ISBN como parámetro de ruta y clave, o un id numérico propio

Elegí el **ISBN**, validado, porque:

- El escáner devuelve justamente un ISBN: navegar directo a `/libro/978...` no necesita
  una búsqueda previa ni un estado intermedio.
- La URL es legible y compartible, y coincide con el identificador del dominio (el tipo
  `Libro` que se entregó no tiene otro id).
- Es estable como `key` del `FlatList` (39) y como clave de las listas de espera.

Los problemas que acepto:

- **Libros sin ISBN**: hoy no existen en el catálogo; si mañana hay folletos o revistas,
  haría falta un id interno. La solución sería agregar `id` al tipo y usar el ISBN solo
  cuando exista, sin cambiar las rutas de los libros que sí lo tienen.
- **Dos ediciones del mismo título**: tienen ISBN distintos, así que el detalle, el
  préstamo y la espera quedan separados por edición. Para una biblioteca eso es lo
  correcto (son ejemplares distintos); si se quisiera agrupar por obra, el ISBN no
  alcanzaría y habría que modelar “obra” y “edición”.
- **`useLocalSearchParams` devuelve `string | string[]`** (y con rutas repetidas puede ser
  un arreglo): por eso `esIsbn` (`lib/isbn.ts`) verifica que sea un string de 13 dígitos
  antes de usarlo como clave. Sin esa validación, un arreglo rompería el `find`.

Un id numérico propio daría identidad estable aunque cambien los metadatos y permitiría
libros sin ISBN, pero perdería la navegación directa desde el escáner (habría que buscar
el libro por ISBN para obtener el id) y la URL dejaría de ser significativa.

#### b) Clase `Pila` con `#items` o un arreglo con `[...pila, x]` y `slice`

Usé la **clase** (`src/estructuras/Pila.ts`) y el estado de React como copia publicada:

- La clase encapsula la regla LIFO y expone `tope`, `tamanio`, `apilar`, `desapilar` y
  `aArray`; el “no apilar dos veces el mismo tope” queda en un solo lugar
  (`BibliotecaContext.tsx` 141-143).
- El costo es justamente el que muestra el ejercicio B3: mutar la instancia no
  re-renderiza. Lo resolví reconstruyéndola desde el arreglo del estado en cada mutación
  y devolviendo un arreglo nuevo; la clase es un motor puro, no el estado compartido.
- Reconstruir en cada operación es O(n); con 3 elementos es irrelevante.

Con un arreglo y `[x, ...pila]` + `slice` el código sería más corto y “más React”, pero
la lógica de la pila quedaría mezclada con los componentes y sería fácil saltarse una
regla. La clase también se puede probar sin React (instanciarla y verificar el orden), lo
que es una ventaja para tests unitarios.

La combinación con React fue la parte incómoda: una instancia viva en un `ref` no avisa
cuando cambia y puede quedar desincronizada. Por eso el estado manda y la clase se usa
como transformación.

#### c) Memorización

Usé `useMemo` y `useCallback` en lugares donde hay una razón concreta:

- **`value` del Context** (`BibliotecaContext.tsx` 302-341): está memorizado con todas
  sus dependencias. Sin él, cada render del provider crearía un objeto nuevo y **todos**
  los consumidores se re-renderizarían aunque nada haya cambiado.
- **Callbacks que se pasan a componentes hijos**: `abrirLibro` (`(tabs)/index.tsx` 18-20)
  se pasa al encabezado y a las filas; `reintentar` en `useLibros` (48-52) y en
  `useBusqueda` (59-61); `consultar` en `usePermiso` (24-31), que además es dependencia
  del listener de `AppState`.
- **`useCallback` en `agregarReciente`, `reservar`, etc.**: cambian solo cuando cambian
  sus dependencias, lo que evita que el `value` del Context cambie por una función nueva
  en cada render.

Donde sería ruido:

- `const texto = consulta.trim()` en `useBusqueda`: es una operación de string
  despreciable; memorizarla agrega código sin beneficio.
- Memorizar los estilos de un componente que ya los tiene en `StyleSheet.create`: el
  estilo es estático y no se recalcula.
- `useCallback` para un `onPress` que se pasa a un `Pressable` que de todos modos se
  vuelve a renderizar con su padre: sin `React.memo` en el hijo, no evita ningún render.

**Cómo lo comprobaría en lugar de suponerlo**: con el React DevTools Profiler (o
`why-did-you-render`) grabando una interacción (cambiar de pestaña, activar un
recordatorio) y mirando qué componentes se renderizan y por qué. Si el Catálogo se
re-renderiza al activar un recordatorio, el profiler lo muestra; si un `useMemo` no evita
ningún render, también.

#### d) Datos duplicados y ejemplares disponibles

**No** guardo los disponibles: los calculo (`BibliotecaContext.tsx` 109-117):

```ts
const disponibles = useCallback((libro: Libro): number => {
  const activos = prestamos.filter((p) => p.isbn === libro.isbn).length;
  return Math.max(0, libro.ejemplares - activos);
}, [prestamos]);
```

El dato base es `Libro.ejemplares` (los ejemplares que hay en el estante al iniciar) y los
préstamos activos; la disponibilidad es una resta.

Si se guardara en dos lugares (un campo `disponibles` en el libro y la lista de
préstamos), cada operación tendría que actualizar ambos: reservar (restar), devolver
(sumar), entregar desde el mostrador (no cambiar el total), y cualquier error en uno de
los dos deja el catálogo mintiendo: por ejemplo, mostrar “2 disponibles” con 3 préstamos
activos, o dejar reservar un libro que en realidad no está. El bug aparece cuando una de
las dos copias se actualiza y la otra no, y es difícil de detectar porque cada pantalla
lee una copia distinta.

Con el cálculo, hay una única fuente de verdad y todas las pantallas muestran lo mismo.
El costo es recalcular en cada render (17 libros, despreciable); si fuera costoso, se
podría memorizar el cálculo con `useMemo`.
