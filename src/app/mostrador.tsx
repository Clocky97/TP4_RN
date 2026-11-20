import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { FilaMostrador } from '@/components/FilaMostrador';
import { MensajeEstado } from '@/components/MensajeEstado';
import { colores, espaciado, tamanios } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { buscarLibro } from '@/lib/catalogo';
import type { Libro } from '@/types';

export default function Mostrador() {
  const { esperas, entregarSiguiente, cerrarSesion } = useBiblioteca();
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);

  const filas = Object.entries(esperas).flatMap(([isbn, espera]) => {
    const libro = buscarLibro(isbn);
    return libro && espera.length > 0 ? [{ libro, espera }] : [];
  });

  const entregar = async (libro: Libro) => {
    setOcupado(libro.isbn);
    const resultado = await entregarSiguiente(libro);
    setOcupado(null);
    if (!resultado) {
      setMensaje('Esa lista de espera ya está vacía.');
      return;
    }
    if (!resultado.esParaMi) {
      setMensaje(`Le entregamos “${libro.titulo}” a ${resultado.persona}.`);
      return;
    }
    setMensaje(
      resultado.notificado
        ? `Le entregamos “${libro.titulo}” a ${resultado.persona} (vos). Te enviamos una notificación.`
        : `Le entregamos “${libro.titulo}” a ${resultado.persona} (vos). Te dejamos un aviso en Mis reservas.`,
    );
  };

  return (
    <FlatList
      data={filas}
      keyExtractor={(fila) => fila.libro.isbn}
      renderItem={({ item }) => (
        <FilaMostrador
          libro={item.libro}
          espera={item.espera}
          ocupado={ocupado === item.libro.isbn}
          onEntregar={() => void entregar(item.libro)}
        />
      )}
      ListHeaderComponent={
        <View style={estilos.encabezado}>
          <Text style={estilos.ayuda}>
            Entregá el ejemplar devuelto a la persona que está al frente de
            cada lista.
          </Text>
          {mensaje ? <Text style={estilos.mensaje}>{mensaje}</Text> : null}
          <Boton
            titulo="Cerrar sesión"
            variante="secundario"
            onPress={cerrarSesion}
          />
        </View>
      }
      ListEmptyComponent={
        <MensajeEstado
          titulo="No hay listas de espera"
          descripcion="Cuando alguien reserve un libro sin ejemplares, va a aparecer acá."
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
    padding: espaciado.md,
    gap: espaciado.md,
    flexGrow: 1,
  },
  encabezado: {
    gap: espaciado.sm,
  },
  ayuda: {
    fontSize: tamanios.pequeno,
    color: colores.textoSuave,
  },
  mensaje: {
    fontSize: tamanios.pequeno,
    fontWeight: '600',
    color: colores.primario,
  },
});
