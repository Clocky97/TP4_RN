import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colores, espaciado, radios, tamanios } from '../constants/tema';
import type { Libro } from '../types';

type Props = {
  libros: Libro[];
  onAbrir: (libro: Libro) => void;
};

export function SeccionRecientes({ libros, onAbrir }: Props) {
  return (
    <View style={estilos.seccion}>
      <Text style={estilos.titulo}>Vistos recientemente</Text>
      {libros.length === 0 ? (
        <Text style={estilos.vacio}>
          Todavía no abriste la ficha de ningún libro.
        </Text>
      ) : (
        <View style={estilos.chips}>
          {libros.map((libro) => (
            <Pressable
              key={libro.isbn}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${libro.titulo}`}
              onPress={() => onAbrir(libro)}
              style={({ pressed }) => [
                estilos.chip,
                pressed && estilos.presionado,
              ]}
            >
              <Text style={estilos.chipTexto} numberOfLines={1}>
                {libro.titulo}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: {
    gap: espaciado.sm,
    paddingHorizontal: espaciado.md,
    paddingTop: espaciado.md,
  },
  titulo: {
    fontSize: tamanios.subtitulo,
    fontWeight: '700',
    color: colores.texto,
  },
  vacio: {
    fontSize: tamanios.pequeno,
    color: colores.textoSuave,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
  },
  chip: {
    minHeight: tamanios.toque,
    justifyContent: 'center',
    maxWidth: '100%',
    paddingHorizontal: espaciado.md,
    borderRadius: radios.circulo,
    backgroundColor: colores.primarioSuave,
  },
  presionado: {
    opacity: 0.7,
  },
  chipTexto: {
    fontSize: tamanios.pequeno,
    fontWeight: '600',
    color: colores.primario,
  },
});
