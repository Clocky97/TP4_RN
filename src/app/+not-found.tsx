import { router, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { MensajeEstado } from '@/components/MensajeEstado';
import { colores } from '@/constants/tema';

export default function PantallaNoEncontrada() {
  const ruta = usePathname();

  return (
    <View style={estilos.pantalla}>
      <MensajeEstado
        titulo="Esta pantalla no existe"
        descripcion={`La dirección ${ruta} no corresponde a ninguna pantalla de Biblioteca IPF.`}
        accion={{
          titulo: 'Ir al catálogo',
          onPress: () => router.replace('/'),
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
});
