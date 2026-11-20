import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colores, espaciado, tamanios } from '../constants/tema';
import type { Libro } from '../types';

type Props = {
  libro: Libro;
  disponibles: number;
  onPress: () => void;
};

export function FilaLibro({ libro, disponibles, onPress }: Props) {
  const hayEjemplares = disponibles > 0;
  const textoDisponibilidad = hayEjemplares
    ? `${disponibles} ${disponibles === 1 ? 'ejemplar disponible' : 'ejemplares disponibles'}`
    : 'Sin ejemplares';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${libro.titulo}, de ${libro.autor}. ${textoDisponibilidad}`}
      onPress={onPress}
      style={({ pressed }) => [estilos.fila, pressed && estilos.presionado]}
    >
      <View style={estilos.datos}>
        <Text style={estilos.titulo} numberOfLines={2}>
          {libro.titulo}
        </Text>
        <Text style={estilos.autor} numberOfLines={1}>
          {libro.autor} · {libro.anio}
        </Text>
        <Text
          style={
            hayEjemplares ? estilos.disponible : estilos.sinEjemplares
          }
        >
          {textoDisponibilidad}
        </Text>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: {
    backgroundColor: colores.superficie,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.md,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
    minHeight: tamanios.toque,
  },
  presionado: {
    backgroundColor: colores.primarioSuave,
  },
  datos: {
    gap: espaciado.xs,
  },
  titulo: {
    fontSize: tamanios.cuerpo,
    fontWeight: '700',
    color: colores.texto,
  },
  autor: {
    fontSize: tamanios.pequeno,
    color: colores.textoSuave,
  },
  disponible: {
    fontSize: tamanios.pequeno,
    fontWeight: '600',
    color: colores.exito,
  },
  sinEjemplares: {
    fontSize: tamanios.pequeno,
    fontWeight: '600',
    color: colores.peligro,
  },
});
