import { useCallback, useEffect, useState } from 'react';

import { obtenerLibros } from '../lib/api';
import type { Libro } from '../types';

export type UseLibrosResultado = {
  libros: Libro[];
  cargando: boolean;
  error: string | null;
  reintentar: () => void;
};

export function useLibros(): UseLibrosResultado {
  const [libros, setLibros] = useState<Libro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const datos = await obtenerLibros();
        if (!activo) {
          return;
        }
        setLibros(datos);
        setCargando(false);
      } catch {
        if (!activo) {
          return;
        }
        setError(
          'No pudimos cargar el catálogo. Revisá la conexión e intentá de nuevo.',
        );
        setCargando(false);
      }
    }

    void cargar();

    return () => {
      activo = false;
    };
  }, [intento]);

  const reintentar = useCallback(() => {
    setCargando(true);
    setError(null);
    setIntento((numero) => numero + 1);
  }, []);

  return { libros, cargando, error, reintentar };
}
