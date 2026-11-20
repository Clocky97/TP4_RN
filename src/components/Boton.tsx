import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colores, espaciado, radios, tamanios } from '../constants/tema';

type Variante = 'primario' | 'secundario' | 'peligro';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  deshabilitado?: boolean;
  icono?: ComponentProps<typeof Ionicons>['name'];
};

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  deshabilitado = false,
  icono,
}: Props) {
  const colorIcono =
    variante === 'primario'
      ? colores.superficie
      : variante === 'peligro'
        ? colores.peligro
        : colores.primario;
  const estiloTexto =
    variante === 'primario'
      ? estilos.textoPrimario
      : variante === 'peligro'
        ? estilos.textoPeligro
        : estilos.textoSecundario;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        estilos[variante],
        deshabilitado && estilos.deshabilitado,
        pressed && !deshabilitado && estilos.presionado,
      ]}
    >
      {icono ? (
        <Ionicons name={icono} size={tamanios.icono} color={colorIcono} />
      ) : null}
      <Text style={[estilos.texto, estiloTexto]}>{titulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: tamanios.toque,
    borderRadius: radios.md,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.sm,
  },
  primario: {
    backgroundColor: colores.primario,
  },
  secundario: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  peligro: {
    backgroundColor: colores.peligroSuave,
    borderWidth: 1,
    borderColor: colores.peligro,
  },
  presionado: {
    opacity: 0.7,
  },
  deshabilitado: {
    opacity: 0.45,
  },
  texto: {
    fontSize: tamanios.cuerpo,
    fontWeight: '600',
    textAlign: 'center',
  },
  textoPrimario: {
    color: colores.superficie,
  },
  textoSecundario: {
    color: colores.primario,
  },
  textoPeligro: {
    color: colores.peligro,
  },
});
