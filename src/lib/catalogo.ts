import { LIBROS } from '../data/libros';
import type { Libro } from '../types';

export function buscarLibro(isbn: string): Libro | undefined {
  return LIBROS.find((libro) => libro.isbn === isbn);
}
