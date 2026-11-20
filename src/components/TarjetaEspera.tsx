import { StyleSheet, Text, View } from 'react-native';

import { colores, espaciado, radios, tamanios } from '../constants/tema';
import type { Libro } from '../types';

type Props = {
  libro: Libro;
  posicion: number;
};

export function TarjetaEspera({ libro, posicion }: Props) {
  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.titulo}>{libro.titulo}</Text>
      <Text style={estilos.autor}>{libro.autor}</Text>
      <Text style={estilos.posicion}>
        Estás en el puesto {posicion} de la lista de espera.
      </Text>
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
  posicion: {
    fontSize: tamanios.pequeno,
    fontWeight: '600',
    color: colores.aviso,
  },
});
