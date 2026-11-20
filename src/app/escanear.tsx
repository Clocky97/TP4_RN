import { CameraView } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { PantallaCargando } from '@/components/PantallaCargando';
import { colores, espaciado, radios, tamanios } from '@/constants/tema';
import { usePermiso } from '@/hooks/usePermiso';
import { buscarLibro } from '@/lib/catalogo';
import { esIsbn, limpiarIsbn } from '@/lib/isbn';

export default function Escanear() {
  const { estado, consultar } = usePermiso('camara');
  const [codigo, setCodigo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const navegando = useRef(false);
  const ultimoAviso = useRef<{ codigo: string; momento: number } | null>(
    null,
  );

  useFocusEffect(
    useCallback(() => {
      void consultar();
    }, [consultar]),
  );

  const procesar = useCallback((valor: string) => {
    if (navegando.current) {
      return;
    }
    const isbn = limpiarIsbn(valor);
    if (!esIsbn(isbn)) {
      setMensaje('El código tiene que ser un ISBN de 13 dígitos.');
      return;
    }
    if (!buscarLibro(isbn)) {
      const ahora = Date.now();
      const previo = ultimoAviso.current;
      if (previo?.codigo === isbn && ahora - previo.momento < 3000) {
        return;
      }
      ultimoAviso.current = { codigo: isbn, momento: ahora };
      setMensaje(
        `No encontramos un libro con el ISBN ${isbn}. Podés seguir escaneando o escribirlo a mano.`,
      );
      return;
    }
    navegando.current = true;
    setMensaje('');
    router.replace(`/libro/${isbn}`);
  }, []);

  if (estado === 'cargando') {
    return <PantallaCargando mensaje="Consultando el permiso de cámara…" />;
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      {estado === 'concedido' ? (
        <View style={estilos.camara}>
          <CameraView
            style={estilos.vista}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
            onBarcodeScanned={({ data }) => procesar(data)}
          />
        </View>
      ) : (
        <View style={estilos.permiso}>
          <Text style={estilos.permisoTitulo}>
            {estado === 'bloqueado'
              ? 'La cámara está bloqueada'
              : 'Necesitamos tu cámara'}
          </Text>
          <Text style={estilos.permisoTexto}>
            Usamos tu cámara para leer el código de barras del libro y abrir
            su ficha sin que escribas el ISBN. Si preferís, podés escribirlo
            abajo.
          </Text>
          <Boton
            titulo={
              estado === 'bloqueado' ? 'Revisar permiso' : 'Habilitar cámara'
            }
            variante="secundario"
            onPress={() => router.push('/permisos/camara')}
          />
        </View>
      )}

      {mensaje ? (
        <View style={estilos.aviso}>
          <Text style={estilos.avisoTexto}>{mensaje}</Text>
        </View>
      ) : null}

      <View style={estilos.manual}>
        <Text style={estilos.manualTitulo}>Escribir el ISBN</Text>
        <CampoTexto
          etiqueta="ISBN de 13 dígitos"
          valor={codigo}
          onCambiar={setCodigo}
          placeholder="9788437604947"
          keyboardType="number-pad"
          maxLength={13}
          autoCapitalize="none"
          onSubmitEditing={() => procesar(codigo)}
        />
        <Boton
          titulo="Abrir libro"
          variante="secundario"
          onPress={() => procesar(codigo)}
        />
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espaciado.md,
    gap: espaciado.md,
  },
  camara: {
    height: 280,
    borderRadius: radios.md,
    overflow: 'hidden',
    backgroundColor: colores.texto,
  },
  vista: {
    flex: 1,
  },
  permiso: {
    backgroundColor: colores.superficie,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
    gap: espaciado.sm,
  },
  permisoTitulo: {
    fontSize: tamanios.subtitulo,
    fontWeight: '700',
    color: colores.texto,
  },
  permisoTexto: {
    fontSize: tamanios.pequeno,
    color: colores.textoSuave,
  },
  aviso: {
    backgroundColor: colores.avisoSuave,
    borderRadius: radios.md,
    padding: espaciado.md,
  },
  avisoTexto: {
    fontSize: tamanios.pequeno,
    color: colores.aviso,
  },
  manual: {
    backgroundColor: colores.superficie,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
    gap: espaciado.sm,
  },
  manualTitulo: {
    fontSize: tamanios.subtitulo,
    fontWeight: '700',
    color: colores.texto,
  },
});
