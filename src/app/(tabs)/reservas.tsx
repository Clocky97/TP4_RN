import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { MensajeEstado } from '@/components/MensajeEstado';
import { SeccionAvisos } from '@/components/SeccionAvisos';
import { TarjetaEspera } from '@/components/TarjetaEspera';
import { TarjetaPrestamo } from '@/components/TarjetaPrestamo';
import { colores, espaciado, radios, tamanios } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { usePermiso } from '@/hooks/usePermiso';
import { buscarLibro } from '@/lib/catalogo';
import type { EstadoPermiso } from '@/types';

const TEXTOS_PERMISO: Record<EstadoPermiso, string> = {
  cargando: 'Consultando el permiso de notificaciones…',
  concedido: 'Las notificaciones están permitidas.',
  preguntable: 'Las notificaciones están desactivadas.',
  bloqueado: 'Las notificaciones están bloqueadas en el sistema.',
};

export default function MisReservas() {
  const {
    prestamos,
    esperas,
    avisos,
    posicionEnEspera,
    devolver,
    alternarRecordatorio,
    descartarAviso,
  } = useBiblioteca();
  const { estado: estadoNotificaciones, consultar } =
    usePermiso('notificaciones');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState('');

  useFocusEffect(
    useCallback(() => {
      void consultar();
    }, [consultar]),
  );

  const prestamosConLibro = prestamos.flatMap((prestamo) => {
    const libro = buscarLibro(prestamo.isbn);
    return libro ? [{ prestamo, libro }] : [];
  });

  const esperasConLibro = Object.keys(esperas).flatMap((isbn) => {
    const libro = buscarLibro(isbn);
    const posicion = posicionEnEspera(isbn);
    return libro && posicion !== null ? [{ libro, posicion }] : [];
  });

  const cambiarRecordatorio = async (isbn: string, activar: boolean) => {
    setOcupado(isbn);
    const resultado = await alternarRecordatorio(isbn, activar);
    setOcupado(null);
    setMensaje(
      resultado.permisoDenegado
        ? 'No pudimos activar el recordatorio porque las notificaciones están bloqueadas. Revisá el permiso y volvé a intentarlo.'
        : '',
    );
  };

  const confirmarDevolucion = async (isbn: string) => {
    setOcupado(isbn);
    await devolver(isbn);
    setOcupado(null);
    setMensaje('Registramos la devolución y cancelamos su recordatorio.');
  };

  const sinReservas =
    prestamosConLibro.length === 0 &&
    esperasConLibro.length === 0 &&
    avisos.length === 0;

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <View
        style={[
          estilos.permiso,
          estadoNotificaciones === 'concedido'
            ? estilos.permisoOk
            : estilos.permisoAviso,
        ]}
      >
        <Ionicons
          name={
            estadoNotificaciones === 'concedido'
              ? 'notifications-outline'
              : 'notifications-off-outline'
          }
          size={tamanios.iconoGrande}
          color={colores.primario}
        />
        <Text style={estilos.permisoTexto}>
          {TEXTOS_PERMISO[estadoNotificaciones]}
        </Text>
        {estadoNotificaciones === 'bloqueado' ||
        estadoNotificaciones === 'preguntable' ? (
          <Boton
            titulo="Revisar permiso"
            variante="secundario"
            onPress={() => router.push('/permisos/notificaciones')}
          />
        ) : null}
      </View>

      {mensaje ? <Text style={estilos.mensaje}>{mensaje}</Text> : null}

      <Text style={estilos.tituloSeccion}>Mis préstamos</Text>
      {prestamosConLibro.length === 0 ? (
        <Text style={estilos.vacio}>No tenés préstamos activos.</Text>
      ) : (
        prestamosConLibro.map(({ prestamo, libro }) => (
          <TarjetaPrestamo
            key={prestamo.isbn}
            libro={libro}
            prestamo={prestamo}
            ocupado={ocupado === prestamo.isbn}
            onDevolver={() => void confirmarDevolucion(prestamo.isbn)}
            onCambiarRecordatorio={(activar) =>
              void cambiarRecordatorio(prestamo.isbn, activar)
            }
          />
        ))
      )}

      <Text style={estilos.tituloSeccion}>Reservas en espera</Text>
      {esperasConLibro.length === 0 ? (
        <Text style={estilos.vacio}>
          No estás esperando ningún libro.
        </Text>
      ) : (
        esperasConLibro.map(({ libro, posicion }) => (
          <TarjetaEspera
            key={libro.isbn}
            libro={libro}
            posicion={posicion}
          />
        ))
      )}

      <SeccionAvisos avisos={avisos} onDescartar={descartarAviso} />

      {sinReservas ? (
        <MensajeEstado
          titulo="Todavía no tenés reservas"
          descripcion="Buscá un libro en el catálogo y reservalo para verlo acá."
          accion={{ titulo: 'Ir al catálogo', onPress: () => router.push('/') }}
        />
      ) : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espaciado.md,
    gap: espaciado.md,
    paddingBottom: espaciado.xl,
  },
  permiso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    borderRadius: radios.md,
    padding: espaciado.md,
    flexWrap: 'wrap',
  },
  permisoOk: {
    backgroundColor: colores.exitoSuave,
  },
  permisoAviso: {
    backgroundColor: colores.avisoSuave,
  },
  permisoTexto: {
    flex: 1,
    fontSize: tamanios.pequeno,
    color: colores.texto,
  },
  mensaje: {
    fontSize: tamanios.pequeno,
    fontWeight: '600',
    color: colores.primario,
  },
  tituloSeccion: {
    fontSize: tamanios.subtitulo,
    fontWeight: '700',
    color: colores.texto,
    marginTop: espaciado.sm,
  },
  vacio: {
    fontSize: tamanios.pequeno,
    color: colores.textoSuave,
  },
});
