import AsyncStorage from '@react-native-async-storage/async-storage';

import { CLAVE_ALMACENAMIENTO } from '../constants/biblioteca';
import type { Aviso, Libro, Prestamo } from '../types';

export type EstadoGuardado = {
  prestamos: Prestamo[];
  esperas: Record<string, string[]>;
  recientes: Libro[];
  avisos: Aviso[];
};

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function esLibro(valor: unknown): valor is Libro {
  if (!esRegistro(valor)) {
    return false;
  }
  return (
    typeof valor.isbn === 'string' &&
    typeof valor.titulo === 'string' &&
    typeof valor.autor === 'string' &&
    typeof valor.anio === 'number' &&
    typeof valor.ejemplares === 'number'
  );
}

function esPrestamo(valor: unknown): valor is Prestamo {
  if (!esRegistro(valor)) {
    return false;
  }
  return (
    typeof valor.isbn === 'string' &&
    typeof valor.fechaDevolucion === 'string' &&
    typeof valor.recordatorioActivo === 'boolean' &&
    (typeof valor.notificacionId === 'string' || valor.notificacionId === null)
  );
}

function esAviso(valor: unknown): valor is Aviso {
  if (!esRegistro(valor)) {
    return false;
  }
  return typeof valor.id === 'string' && typeof valor.texto === 'string';
}

function esEsperas(valor: unknown): valor is Record<string, string[]> {
  if (!esRegistro(valor)) {
    return false;
  }
  return Object.values(valor).every(
    (lista) =>
      Array.isArray(lista) && lista.every((nombre) => typeof nombre === 'string'),
  );
}

export async function leerEstadoAsync(): Promise<EstadoGuardado | null> {
  const crudo = await AsyncStorage.getItem(CLAVE_ALMACENAMIENTO).catch(
    () => null,
  );
  if (!crudo) {
    return null;
  }
  try {
    const datos: unknown = JSON.parse(crudo);
    if (!esRegistro(datos)) {
      return null;
    }
    return {
      prestamos: Array.isArray(datos.prestamos)
        ? datos.prestamos.filter(esPrestamo)
        : [],
      esperas: esEsperas(datos.esperas) ? datos.esperas : {},
      recientes: Array.isArray(datos.recientes)
        ? datos.recientes.filter(esLibro)
        : [],
      avisos: Array.isArray(datos.avisos) ? datos.avisos.filter(esAviso) : [],
    };
  } catch {
    return null;
  }
}

export async function guardarEstadoAsync(
  estado: EstadoGuardado,
): Promise<void> {
  await AsyncStorage.setItem(
    CLAVE_ALMACENAMIENTO,
    JSON.stringify(estado),
  ).catch(() => undefined);
}
