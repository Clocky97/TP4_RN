import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { MensajeEstado } from '@/components/MensajeEstado';
import { DIAS_PRESTAMO } from '@/constants/biblioteca';
import { colores, espaciado, radios, tamanios } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { buscarLibro } from '@/lib/catalogo';
import { fechaEnDias, formatearFecha } from '@/lib/fechas';
import { esIsbn } from '@/lib/isbn';

export default function ConfirmarReserva() {
  const { isbn } = useLocalSearchParams<{ isbn?: string }>();
  const { disponibles, esperas, reservar, yaReservado } = useBiblioteca();
  const [error, setError] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const libro = esIsbn(isbn) ? buscarLibro(isbn) : undefined;

  if (!libro) {
    return (
      <MensajeEstado
        titulo="No encontramos ese libro"
        descripcion="El ISBN no está en el catálogo de la biblioteca."
        accion={{
          titulo: 'Volver al catálogo',
          onPress: () => router.dismissTo('/'),
        }}
      />
    );
  }

  const copias = disponibles(libro);
  const esperando = esperas[libro.isbn]?.length ?? 0;
  const reservado = yaReservado(libro.isbn);

  const cancelar = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const confirmar = () => {
    if (confirmando) {
      return;
    }
    setConfirmando(true);
    const resultado = reservar(libro);
    if (!resultado.ok) {
      setConfirmando(false);
      setError(
        'Ya tenés este libro en préstamo o en la lista de espera. Podés verlo en Mis reservas.',
      );
      return;
    }
    router.dismissTo('/reservas');
  };

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <View style={estilos.tarjeta}>
        <Text style={estilos.titulo}>{libro.titulo}</Text>
        <Text style={estilos.autor}>{libro.autor}</Text>
        {copias > 0 ? (
          <Text style={estilos.detalle}>
            Hay {copias} {copias === 1 ? 'ejemplar' : 'ejemplares'}. Te
            llevás el libro por {DIAS_PRESTAMO} días, hasta el{' '}
            {formatearFecha(fechaEnDias(DIAS_PRESTAMO))}.
          </Text>
        ) : (
          <Text style={estilos.detalle}>
            No hay ejemplares disponibles. Vas a quedar en el puesto{' '}
            {esperando + 1} de la lista de espera y te avisamos cuando se
            libere.
          </Text>
        )}
      </View>
      {reservado ? (
        <Text style={estilos.aviso}>
          Ya tenés este libro reservado. Podés verlo en Mis reservas.
        </Text>
      ) : null}
      {error ? <Text style={estilos.error}>{error}</Text> : null}
      <Boton
        titulo="Confirmar"
        onPress={confirmar}
        deshabilitado={reservado || confirmando}
      />
      <Boton titulo="Cancelar" variante="secundario" onPress={cancelar} />
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
    padding: espaciado.md,
    gap: espaciado.sm,
  },
  titulo: {
    fontSize: tamanios.titulo,
    fontWeight: '700',
    color: colores.texto,
  },
  autor: {
    fontSize: tamanios.cuerpo,
    color: colores.textoSuave,
  },
  detalle: {
    fontSize: tamanios.cuerpo,
    color: colores.texto,
  },
  aviso: {
    fontSize: tamanios.pequeno,
    color: colores.aviso,
  },
  error: {
    fontSize: tamanios.pequeno,
    fontWeight: '600',
    color: colores.peligro,
  },
});
