import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { ColorValue } from 'react-native';

import { colores, espaciado, tamanios } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';

export const unstable_settings = {
  anchor: 'index',
};

type PropsIcono = {
  color: ColorValue | null;
  size: number;
};

function IconoCatalogo({ color, size }: PropsIcono) {
  return (
    <Ionicons
      name="library-outline"
      size={size}
      color={typeof color === 'string' ? color : colores.primario}
    />
  );
}

function IconoReservas({ color, size }: PropsIcono) {
  return (
    <Ionicons
      name="bookmark-outline"
      size={size}
      color={typeof color === 'string' ? color : colores.primario}
    />
  );
}

function AccesoPersonal() {
  const { sesion } = useBiblioteca();
  const destino = sesion ? '/mostrador' : '/login';
  const etiqueta = sesion ? 'Mostrador' : 'Personal';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={espaciado.sm}
      onPress={() => router.push(destino)}
      style={({ pressed }) => [
        estilos.acceso,
        pressed && estilos.presionado,
      ]}
    >
      <Text style={estilos.accesoTexto}>{etiqueta}</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoSuave,
        tabBarStyle: {
          backgroundColor: colores.superficie,
          borderTopColor: colores.borde,
        },
        headerStyle: { backgroundColor: colores.superficie },
        headerTintColor: colores.texto,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Catálogo',
          tabBarIcon: IconoCatalogo,
          headerRight: AccesoPersonal,
        }}
      />
      <Tabs.Screen
        name="reservas"
        options={{
          title: 'Mis reservas',
          tabBarIcon: IconoReservas,
        }}
      />
    </Tabs>
  );
}

const estilos = StyleSheet.create({
  acceso: {
    minHeight: tamanios.toque,
    minWidth: tamanios.toque,
    justifyContent: 'center',
    paddingHorizontal: espaciado.md,
  },
  presionado: {
    opacity: 0.6,
  },
  accesoTexto: {
    fontSize: tamanios.cuerpo,
    fontWeight: '600',
    color: colores.primario,
  },
});
