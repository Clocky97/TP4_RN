import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { MensajeEstado } from '@/components/MensajeEstado';
import { colores, espaciado, radios, tamanios } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { buscarLibro } from '@/lib/catalogo';
import { esIsbn } from '@/lib/isbn';

export default function DetalleLibro() {
  const { isbn } = useLocalSearchParams<{ isbn?: string }>();
  const {
    disponibles,
    esperas,
    posicionEnEspera,
    yaReservado,
    agregarReciente,
  } = useBiblioteca();
  const libro = esIsbn(isbn) ? buscarLibro(isbn) : undefined;

  useEffect(() => {
    if (libro) {
      agregarReciente(libro);
    }
  }, [libro, agregarReciente]);

  if (!libro) {
    return (
      <MensajeEstado
        titulo="No encontramos ese libro"
        descripcion={
          esIsbn(isbn)
            ? 'El ISBN no está en el catálogo de la biblioteca.'
            : 'El código del libro tiene que tener 13 dígitos.'
        }
        accion={{
          titulo: 'Volver al catálogo',
          onPress: () => router.dismissTo('/'),
        }}
      />
    );
  }

  const copias = disponibles(libro);
  const enEspera = esperas[libro.isbn]?.length ?? 0;
  const posicion = posicionEnEspera(libro.isbn);
  const reservado = yaReservado(libro.isbn);

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <Stack.Screen options={{ title: libro.titulo }} />
      <View style={estilos.ficha}>
        <Text style={estilos.titulo}>{libro.titulo}</Text>
        <Text style={estilos.autor}>{libro.autor}</Text>
        <Text style={estilos.dato}>Año de publicación: {libro.anio}</Text>
        <Text style={estilos.dato}>ISBN: {libro.isbn}</Text>
        <Text
          style={copias > 0 ? estilos.disponible : estilos.sinEjemplares}
        >
          {copias > 0
            ? `${copias} ${copias === 1 ? 'ejemplar disponible' : 'ejemplares disponibles'}`
            : 'Sin ejemplares disponibles'}
        </Text>
        <Text style={estilos.dato}>
          Personas en lista de espera: {enEspera}
        </Text>
      </View>
      {reservado ? (
        <View style={estilos.aviso}>
          <Text style={estilos.avisoTexto}>
            {posicion !== null
              ? `Ya estás en la lista de espera, en el puesto ${posicion}.`
              : 'Ya tenés este libro en préstamo.'}
          </Text>
        </View>
      ) : (
        <Boton
          titulo="Reservar"
          onPress={() => router.push(`/reservar/${libro.isbn}`)}
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
  ficha: {
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
    fontSize: tamanios.subtitulo,
    color: colores.textoSuave,
  },
  dato: {
    fontSize: tamanios.pequeno,
    color: colores.textoSuave,
  },
  disponible: {
    fontSize: tamanios.cuerpo,
    fontWeight: '700',
    color: colores.exito,
  },
  sinEjemplares: {
    fontSize: tamanios.cuerpo,
    fontWeight: '700',
    color: colores.peligro,
  },
  aviso: {
    backgroundColor: colores.primarioSuave,
    borderRadius: radios.md,
    padding: espaciado.md,
  },
  avisoTexto: {
    fontSize: tamanios.cuerpo,
    color: colores.primario,
  },
});
