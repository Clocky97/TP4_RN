import { useCallback, useEffect, useState } from 'react';

import { buscarLibros } from '../lib/api';
import type { Libro } from '../types';

export type UseBusquedaResultado = {
  resultados: Libro[];
  cargando: boolean;
  error: string | null;
  reintentar: () => void;
};

type Busqueda = {
  texto: string;
  intento: number;
  resultados: Libro[];
  error: string | null;
};

export function useBusqueda(consulta: string): UseBusquedaResultado {
  const [busqueda, setBusqueda] = useState<Busqueda | null>(null);
  const [intento, setIntento] = useState(0);
  const texto = consulta.trim();

  useEffect(() => {
    if (texto.length === 0) {
      return;
    }

    let activo = true;

    async function buscar() {
      try {
        const datos = await buscarLibros(texto);
        if (!activo) {
          return;
        }
        setBusqueda({ texto, intento, resultados: datos, error: null });
      } catch {
        if (!activo) {
          return;
        }
        setBusqueda({
          texto,
          intento,
          resultados: [],
          error: 'No pudimos completar la búsqueda. Intentá de nuevo.',
        });
      }
    }

    void buscar();

    return () => {
      activo = false;
    };
  }, [texto, intento]);

  const reintentar = useCallback(() => {
    setIntento((numero) => numero + 1);
  }, []);

  const pendiente =
    busqueda === null || busqueda.texto !== texto || busqueda.intento !== intento;

  if (pendiente) {
    return {
      resultados: [],
      cargando: texto.length > 0,
      error: null,
      reintentar,
    };
  }

  return {
    resultados: busqueda.resultados,
    cargando: false,
    error: busqueda.error,
    reintentar,
  };
}
