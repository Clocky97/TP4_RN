import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { CampoTexto } from '@/components/CampoTexto';
import { FilaLibro } from '@/components/FilaLibro';
import { MensajeEstado } from '@/components/MensajeEstado';
import { PantallaCargando } from '@/components/PantallaCargando';
import { colores, espaciado } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { useBusqueda } from '@/hooks/useBusqueda';
import type { Libro } from '@/types';

export default function Buscar() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const consulta = typeof q === 'string' ? q : '';
  const texto = consulta.trim();
  const { resultados, cargando, error, reintentar } = useBusqueda(consulta);
  const { disponibles } = useBiblioteca();

  const alEscribir = useCallback((valor: string) => {
    router.setParams({ q: valor });
  }, []);

  const abrirLibro = useCallback((libro: Libro) => {
    router.push(`/libro/${libro.isbn}`);
  }, []);

  return (
    <View style={estilos.pantalla}>
      <View style={estilos.buscador}>
        <CampoTexto
          etiqueta="Buscar por título o autor"
          valor={consulta}
          onCambiar={alEscribir}
          placeholder="Ej.: Borges, Cortázar, 1984"
          autoCapitalize="none"
          autoFocus
        />
      </View>
      {texto.length === 0 ? (
        <MensajeEstado
          titulo="Escribí un título o un autor"
          descripcion="Los resultados se actualizan mientras escribís y quedan guardados en la dirección."
        />
      ) : null}
      {texto.length > 0 && cargando ? (
        <PantallaCargando mensaje="Buscando…" />
      ) : null}
      {texto.length > 0 && !cargando && error ? (
        <MensajeEstado
          titulo="La búsqueda no terminó bien"
          descripcion={error}
          accion={{ titulo: 'Reintentar', onPress: reintentar }}
        />
      ) : null}
      {texto.length > 0 && !cargando && !error ? (
        <FlatList
          data={resultados}
          keyExtractor={(libro) => libro.isbn}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <FilaLibro
              libro={item}
              disponibles={disponibles(item)}
              onPress={() => abrirLibro(item)}
            />
          )}
          ListEmptyComponent={
            <MensajeEstado
              titulo="Sin resultados"
              descripcion={`No encontramos libros que coincidan con “${texto}”.`}
            />
          }
          contentContainerStyle={estilos.contenido}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  buscador: {
    padding: espaciado.md,
    backgroundColor: colores.superficie,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  contenido: {
    flexGrow: 1,
    paddingBottom: espaciado.xl,
  },
});
