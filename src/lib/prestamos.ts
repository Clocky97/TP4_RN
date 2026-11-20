import { DIAS_PRESTAMO } from '../constants/biblioteca';
import type { Prestamo } from '../types';
import { fechaEnDias } from './fechas';

export function crearPrestamo(isbn: string): Prestamo {
  return {
    isbn,
    fechaDevolucion: fechaEnDias(DIAS_PRESTAMO),
    recordatorioActivo: false,
    notificacionId: null,
  };
}
