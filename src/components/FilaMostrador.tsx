import { StyleSheet, Text, View } from 'react-native';

import { colores, espaciado, radios, tamanios } from '../constants/tema';
import type { Libro } from '../types';
import { Boton } from './Boton';

type Props = {
  libro: Libro;
  espera: string[];
  ocupado: boolean;
  onEntregar: () => void;
};

export function FilaMostrador({ libro, espera, ocupado, onEntregar }: Props) {
  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.titulo}>{libro.titulo}</Text>
      <Text style={estilos.detalle}>Al frente: {espera[0]}</Text>
      <Text style={estilos.detalle}>
        {espera.length === 1
          ? 'Espera 1 persona.'
          : `Esperan ${espera.length} personas.`}
      </Text>
      <Boton
        titulo="Entregar al siguiente"
        deshabilitado={ocupado}
        onPress={onEntregar}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
    gap: espaciado.sm,
  },
  titulo: {
    fontSize: tamanios.cuerpo,
    fontWeight: '700',
    color: colores.texto,
  },
  detalle: {
    fontSize: tamanios.pequeno,
    color: colores.textoSuave,
  },
});
