import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colores, espaciado, radios, tamanios } from '../constants/tema';
import type { Aviso } from '../types';

type Props = {
  avisos: Aviso[];
  onDescartar: (id: string) => void;
};

export function SeccionAvisos({ avisos, onDescartar }: Props) {
  if (avisos.length === 0) {
    return null;
  }

  return (
    <View style={estilos.seccion}>
      <Text style={estilos.titulo}>Avisos</Text>
      {avisos.map((aviso) => (
        <View key={aviso.id} style={estilos.aviso}>
          <Text style={estilos.texto}>{aviso.texto}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Descartar aviso"
            onPress={() => onDescartar(aviso.id)}
            style={({ pressed }) => [
              estilos.descartar,
              pressed && estilos.presionado,
            ]}
          >
            <Text style={estilos.descartarTexto}>Descartar</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: {
    gap: espaciado.sm,
  },
  titulo: {
    fontSize: tamanios.subtitulo,
    fontWeight: '700',
    color: colores.texto,
  },
  aviso: {
    backgroundColor: colores.avisoSuave,
    borderRadius: radios.md,
    padding: espaciado.md,
    gap: espaciado.sm,
  },
  texto: {
    fontSize: tamanios.pequeno,
    color: colores.aviso,
  },
  descartar: {
    minHeight: tamanios.toque,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: espaciado.sm,
  },
  presionado: {
    opacity: 0.7,
  },
  descartarTexto: {
    fontSize: tamanios.pequeno,
    fontWeight: '700',
    color: colores.aviso,
  },
});
