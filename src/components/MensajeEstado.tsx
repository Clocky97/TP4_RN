import { StyleSheet, Text, View } from 'react-native';

import { colores, espaciado, tamanios } from '../constants/tema';
import { Boton } from './Boton';

type Accion = {
  titulo: string;
  onPress: () => void;
};

type Props = {
  titulo: string;
  descripcion?: string;
  accion?: Accion;
};

export function MensajeEstado({ titulo, descripcion, accion }: Props) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>{titulo}</Text>
      {descripcion ? <Text style={estilos.descripcion}>{descripcion}</Text> : null}
      {accion ? (
        <View style={estilos.accion}>
          <Boton titulo={accion.titulo} onPress={accion.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.xl,
  },
  titulo: {
    fontSize: tamanios.subtitulo,
    fontWeight: '700',
    color: colores.texto,
    textAlign: 'center',
  },
  descripcion: {
    fontSize: tamanios.cuerpo,
    color: colores.textoSuave,
    textAlign: 'center',
  },
  accion: {
    marginTop: espaciado.sm,
    alignSelf: 'stretch',
  },
});
