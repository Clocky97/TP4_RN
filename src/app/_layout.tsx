import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';

import { PantallaCargando } from '@/components/PantallaCargando';
import { colores, tamanios } from '@/constants/tema';
import { BibliotecaProvider, useBiblioteca } from '@/context/BibliotecaContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <BibliotecaProvider>
      <StatusBar style="dark" />
      <Navegacion />
    </BibliotecaProvider>
  );
}

function Navegacion() {
  const { hidratando, sesion } = useBiblioteca();
  const ruta = usePathname();
  const ingresoPendiente = useRef(false);

  useEffect(() => {
    if (!sesion) {
      ingresoPendiente.current = false;
      return;
    }
    ingresoPendiente.current = true;
  }, [sesion]);

  useEffect(() => {
    if (!sesion || !ingresoPendiente.current || ruta === '/login') {
      return;
    }
    ingresoPendiente.current = false;
    router.navigate('/mostrador');
  }, [sesion, ruta]);

  if (hidratando) {
    return <PantallaCargando mensaje="Abriendo la biblioteca…" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colores.superficie },
        headerTintColor: colores.primario,
        headerTitleStyle: {
          color: colores.texto,
          fontSize: tamanios.subtitulo,
          fontWeight: '700',
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="libro/[isbn]" options={{ title: 'Detalle' }} />
      <Stack.Screen name="buscar" options={{ title: 'Buscar libros' }} />
      <Stack.Screen name="escanear" options={{ title: 'Escanear ISBN' }} />
      <Stack.Screen
        name="reservar/[isbn]"
        options={{ title: 'Confirmar reserva', presentation: 'modal' }}
      />
      <Stack.Screen
        name="permisos/[recurso]"
        options={{ title: 'Permiso', presentation: 'modal' }}
      />
      <Stack.Screen name="reserva" options={{ headerShown: false }} />
      <Stack.Screen
        name="+not-found"
        options={{ title: 'Pantalla no encontrada' }}
      />
      <Stack.Protected guard={!sesion}>
        <Stack.Screen
          name="login"
          options={{ title: 'Acceso del personal', presentation: 'modal' }}
        />
      </Stack.Protected>
      <Stack.Protected guard={sesion}>
        <Stack.Screen name="mostrador" options={{ title: 'Mostrador' }} />
      </Stack.Protected>
    </Stack>
  );
}
