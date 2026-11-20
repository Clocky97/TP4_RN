import type { ComponentProps } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colores, espaciado, radios, tamanios } from '../constants/tema';

type Props = {
  etiqueta: string;
  valor: string;
  onCambiar: (texto: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: ComponentProps<typeof TextInput>['autoCapitalize'];
  maxLength?: number;
  autoCorrect?: boolean;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
};

export function CampoTexto({
  etiqueta,
  valor,
  onCambiar,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
  autoCorrect = false,
  autoFocus = false,
  onSubmitEditing,
}: Props) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        accessibilityLabel={etiqueta}
        value={valor}
        onChangeText={onCambiar}
        placeholder={placeholder}
        placeholderTextColor={colores.textoSuave}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        maxLength={maxLength}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="done"
        style={estilos.entrada}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: espaciado.xs,
  },
  etiqueta: {
    fontSize: tamanios.pequeno,
    fontWeight: '600',
    color: colores.texto,
  },
  entrada: {
    minHeight: tamanios.toque,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.md,
    backgroundColor: colores.superficie,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    fontSize: tamanios.cuerpo,
    color: colores.texto,
  },
});
