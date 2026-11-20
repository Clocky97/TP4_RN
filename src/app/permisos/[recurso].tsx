import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Boton } from '@/components/Boton';
import { MensajeEstado } from '@/components/MensajeEstado';
import { colores, espaciado, radios, tamanios } from '@/constants/tema';
import { usePermiso } from '@/hooks/usePermiso';
import type { RecursoPermiso } from '@/types';

const BENEFICIOS: Record<RecursoPermiso, string> = {
  camara:
    'Usamos tu cámara para leer el código de barras del libro y abrir su ficha sin que escribas el ISBN.',
  notificaciones:
    'Usamos tus notificaciones para recordarte la fecha de devolución y avisarte cuando tu reserva está lista.',
};

const TITULOS: Record<RecursoPermiso, string> = {
  camara: 'Permiso de cámara',
  notificaciones: 'Permiso de notificaciones',
};

export default function PantallaPermiso() {
  const { recurso } = useLocalSearchParams<{ recurso?: string }>();
  const reconocido = recurso === 'camara' || recurso === 'notificaciones';
  const elegido: RecursoPermiso =
    recurso === 'notificaciones' ? 'notificaciones' : 'camara';
  const { estado, pedir, abrirAjustes } = usePermiso(elegido);

  const volver = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const continuar = async () => {
    if (estado === 'concedido') {
      volver();
      return;
    }
    const permiso = await pedir();
    if (permiso.granted) {
      volver();
    }
  };

  if (!reconocido) {
    return (
      <MensajeEstado
        titulo="Permiso desconocido"
        descripcion={`No existe el permiso “${String(recurso ?? '')}”.`}
        accion={{ titulo: 'Volver', onPress: volver }}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <Stack.Screen options={{ title: TITULOS[elegido] }} />
      <View style={estilos.tarjeta}>
        <Ionicons
          name={
            elegido === 'camara'
              ? 'camera-outline'
              : 'notifications-outline'
          }
          size={40}
          color={colores.primario}
        />
        <Text style={estilos.titulo}>Necesitamos un permiso</Text>
        <Text style={estilos.beneficio}>{BENEFICIOS[elegido]}</Text>
        {estado === 'cargando' ? (
          <ActivityIndicator color={colores.primario} />
        ) : null}
        {estado === 'concedido' ? (
          <Text style={estilos.concedido}>Permiso concedido.</Text>
        ) : null}
        {estado === 'preguntable' ? (
          <Text style={estilos.detalle}>
            Al continuar vas a ver el diálogo del sistema. Si decís que no,
            podés seguir usando la app.
          </Text>
        ) : null}
        {estado === 'bloqueado' ? (
          <Text style={estilos.bloqueado}>
            El permiso está bloqueado. Habilitalo desde los Ajustes del
            teléfono y volvé a la app.
          </Text>
        ) : null}
      </View>
      {estado === 'bloqueado' ? (
        <Boton titulo="Abrir Ajustes" onPress={abrirAjustes} />
      ) : (
        <Boton
          titulo="Continuar"
          deshabilitado={estado === 'cargando'}
          onPress={() => void continuar()}
        />
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espaciado.md,
    gap: espaciado.md,
  },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.lg,
    gap: espaciado.sm,
    alignItems: 'center',
  },
  titulo: {
    fontSize: tamanios.subtitulo,
    fontWeight: '700',
    color: colores.texto,
    textAlign: 'center',
  },
  beneficio: {
    fontSize: tamanios.cuerpo,
    color: colores.texto,
    textAlign: 'center',
  },
  detalle: {
    fontSize: tamanios.pequeno,
    color: colores.textoSuave,
    textAlign: 'center',
  },
  concedido: {
    fontSize: tamanios.pequeno,
    fontWeight: '700',
    color: colores.exito,
    textAlign: 'center',
  },
  bloqueado: {
    fontSize: tamanios.pequeno,
    fontWeight: '600',
    color: colores.peligro,
    textAlign: 'center',
  },
});
