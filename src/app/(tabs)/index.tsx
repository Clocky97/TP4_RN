import { router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { EncabezadoCatalogo } from '@/components/EncabezadoCatalogo';
import { FilaLibro } from '@/components/FilaLibro';
import { MensajeEstado } from '@/components/MensajeEstado';
import { PantallaCargando } from '@/components/PantallaCargando';
import { colores, espaciado } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { useLibros } from '@/hooks/useLibros';
import type { Libro } from '@/types';

export default function Catalogo() {
  const { libros, cargando, error, reintentar } = useLibros();
  const { recientes, disponibles } = useBiblioteca();

  const abrirLibro = useCallback((libro: Libro) => {
    router.push(`/libro/${libro.isbn}`);
  }, []);

  if (cargando) {
    return <PantallaCargando mensaje="Cargando el catálogo…" />;
  }

  if (error) {
    return (
      <MensajeEstado
        titulo="No pudimos cargar el catálogo"
        descripcion={error}
        accion={{ titulo: 'Reintentar', onPress: reintentar }}
      />
    );
  }

  return (
    <FlatList
      data={libros}
      keyExtractor={(libro) => libro.isbn}
      renderItem={({ item }) => (
        <FilaLibro
          libro={item}
          disponibles={disponibles(item)}
          onPress={() => abrirLibro(item)}
        />
      )}
      ListHeaderComponent={
        <EncabezadoCatalogo
          recientes={recientes}
          onAbrirReciente={abrirLibro}
          onBuscar={() => router.push('/buscar')}
          onEscanear={() => router.push('/escanear')}
        />
      }
      ListEmptyComponent={
        <MensajeEstado
          titulo="La biblioteca está vacía"
          descripcion="Todavía no hay libros cargados. Volvé a intentarlo más tarde."
        />
      }
      contentContainerStyle={estilos.contenido}
      style={estilos.lista}
    />
  );
}

const estilos = StyleSheet.create({
  lista: {
    backgroundColor: colores.fondo,
  },
  contenido: {
    flexGrow: 1,
    paddingBottom: espaciado.xl,
  },
});
