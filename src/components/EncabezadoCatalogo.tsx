import { StyleSheet, View } from 'react-native';

import { espaciado } from '../constants/tema';
import type { Libro } from '../types';
import { Boton } from './Boton';
import { SeccionRecientes } from './SeccionRecientes';

type Props = {
  recientes: Libro[];
  onAbrirReciente: (libro: Libro) => void;
  onBuscar: () => void;
  onEscanear: () => void;
};

export function EncabezadoCatalogo({
  recientes,
  onAbrirReciente,
  onBuscar,
  onEscanear,
}: Props) {
  return (
    <View style={estilos.contenedor}>
      <SeccionRecientes libros={recientes} onAbrir={onAbrirReciente} />
      <View style={estilos.accesos}>
        <View style={estilos.acceso}>
          <Boton
            titulo="Buscar"
            icono="search-outline"
            variante="secundario"
            onPress={onBuscar}
          />
        </View>
        <View style={estilos.acceso}>
          <Boton
            titulo="Escanear"
            icono="barcode-outline"
            variante="secundario"
            onPress={onEscanear}
          />
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: espaciado.md,
    paddingBottom: espaciado.md,
  },
  accesos: {
    flexDirection: 'row',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.md,
  },
  acceso: {
    flex: 1,
  },
});
