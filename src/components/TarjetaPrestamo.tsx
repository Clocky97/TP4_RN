import { StyleSheet, Switch, Text, View } from 'react-native';

import {
  colores,
  espaciado,
  radios,
  tamanios,
} from '../constants/tema';
import { formatearFecha } from '../lib/fechas';
import type { Libro, Prestamo } from '../types';
import { Boton } from './Boton';

type Props = {
  libro: Libro;
  prestamo: Prestamo;
  ocupado: boolean;
  onDevolver: () => void;
  onCambiarRecordatorio: (activar: boolean) => void;
};

export function TarjetaPrestamo({
  libro,
  prestamo,
  ocupado,
  onDevolver,
  onCambiarRecordatorio,
}: Props) {
  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.titulo}>{libro.titulo}</Text>
      <Text style={estilos.autor}>{libro.autor}</Text>
      <Text style={estilos.fecha}>
        Devolver antes del {formatearFecha(prestamo.fechaDevolucion)}
      </Text>
      <View style={estilos.filaRecordatorio}>
        <Text style={estilos.etiquetaRecordatorio}>Recordarme</Text>
        <Switch
          accessibilityLabel={`Recordarme para ${libro.titulo}`}
          value={prestamo.recordatorioActivo}
          onValueChange={onCambiarRecordatorio}
          disabled={ocupado}
          trackColor={{ false: colores.inactivo, true: colores.primario }}
          thumbColor={colores.superficie}
        />
      </View>
      <Boton
        titulo="Devolver"
        variante="peligro"
        deshabilitado={ocupado}
        onPress={onDevolver}
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
  autor: {
    fontSize: tamanios.pequeno,
    color: colores.textoSuave,
  },
  fecha: {
    fontSize: tamanios.pequeno,
    fontWeight: '600',
    color: colores.primario,
  },
  filaRecordatorio: {
    minHeight: tamanios.toque,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.sm,
  },
  etiquetaRecordatorio: {
    fontSize: tamanios.cuerpo,
    color: colores.texto,
  },
});
