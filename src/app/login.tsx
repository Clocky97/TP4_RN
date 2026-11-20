import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import {
  CLAVE_PERSONAL,
  USUARIO_PERSONAL,
} from '@/constants/biblioteca';
import { colores, espaciado, tamanios } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';

export default function Login() {
  const { iniciarSesion } = useBiblioteca();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');

  const entrar = () => {
    if (iniciarSesion(usuario, clave)) {
      setError('');
      return;
    }
    setError('El usuario o la clave no son correctos. Volvé a intentarlo.');
  };

  return (
    <ScrollView
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={estilos.titulo}>Acceso del personal</Text>
      <Text style={estilos.ayuda}>
        Ingresá con el usuario y la clave de la biblioteca para gestionar las
        listas de espera.
      </Text>
      <CampoTexto
        etiqueta="Usuario"
        valor={usuario}
        onCambiar={setUsuario}
        autoCapitalize="none"
        placeholder="personal"
      />
      <CampoTexto
        etiqueta="Clave"
        valor={clave}
        onCambiar={setClave}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Clave del personal"
        onSubmitEditing={entrar}
      />
      {error ? <Text style={estilos.error}>{error}</Text> : null}
      <Boton titulo="Ingresar" onPress={entrar} />
      <Text style={estilos.demo}>
        Para la demo: {USUARIO_PERSONAL} / {CLAVE_PERSONAL}
      </Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espaciado.md,
    gap: espaciado.md,
  },
  titulo: {
    fontSize: tamanios.titulo,
    fontWeight: '700',
    color: colores.texto,
  },
  ayuda: {
    fontSize: tamanios.pequeno,
    color: colores.textoSuave,
  },
  error: {
    fontSize: tamanios.pequeno,
    fontWeight: '600',
    color: colores.peligro,
  },
  demo: {
    fontSize: tamanios.micro,
    color: colores.textoSuave,
  },
});
