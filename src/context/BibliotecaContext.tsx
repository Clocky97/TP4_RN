import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import {
  CLAVE_PERSONAL,
  MAX_RECIENTES,
  NOMBRE_ALUMNO,
  USUARIO_PERSONAL,
} from '../constants/biblioteca';
import { ESPERAS_INICIALES } from '../data/libros';
import { Cola } from '../estructuras/Cola';
import { Pila } from '../estructuras/Pila';
import { buscarLibro } from '../lib/catalogo';
import {
  activarRecordatorioAsync,
  avisarReservaListaAsync,
  cancelarRecordatorioAsync,
} from '../lib/notificaciones';
import {
  guardarEstadoAsync,
  leerEstadoAsync,
  type EstadoGuardado,
} from '../lib/persistencia';
import { crearPrestamo } from '../lib/prestamos';
import type {
  Aviso,
  EntregaMostrador,
  Libro,
  Prestamo,
  ResultadoRecordatorio,
  ResultadoReserva,
} from '../types';

type ContextoBiblioteca = {
  hidratando: boolean;
  prestamos: Prestamo[];
  esperas: Record<string, string[]>;
  recientes: Libro[];
  avisos: Aviso[];
  sesion: boolean;
  disponibles: (libro: Libro) => number;
  posicionEnEspera: (isbn: string) => number | null;
  yaReservado: (isbn: string) => boolean;
  agregarReciente: (libro: Libro) => void;
  reservar: (libro: Libro) => ResultadoReserva;
  devolver: (isbn: string) => Promise<void>;
  alternarRecordatorio: (
    isbn: string,
    activar: boolean,
  ) => Promise<ResultadoRecordatorio>;
  entregarSiguiente: (libro: Libro) => Promise<EntregaMostrador | null>;
  iniciarSesion: (usuario: string, clave: string) => boolean;
  cerrarSesion: () => void;
  descartarAviso: (id: string) => void;
};

const BibliotecaContexto = createContext<ContextoBiblioteca | null>(null);

let contadorAvisos = 0;

function crearAviso(texto: string): Aviso {
  contadorAvisos += 1;
  return { id: `aviso-${Date.now()}-${contadorAvisos}`, texto };
}

export function BibliotecaProvider({ children }: { children: ReactNode }) {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [esperas, setEsperas] =
    useState<Record<string, string[]>>(ESPERAS_INICIALES);
  const [recientes, setRecientes] = useState<Libro[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [sesion, setSesion] = useState(false);
  const [hidratando, setHidratando] = useState(true);

  useEffect(() => {
    let activo = true;
    void leerEstadoAsync().then((guardado) => {
      if (!activo) {
        return;
      }
      if (guardado) {
        setPrestamos(guardado.prestamos);
        setEsperas(guardado.esperas);
        setRecientes(guardado.recientes);
        setAvisos(guardado.avisos);
      }
      setHidratando(false);
    });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (hidratando) {
      return;
    }
    const estado: EstadoGuardado = { prestamos, esperas, recientes, avisos };
    void guardarEstadoAsync(estado);
  }, [hidratando, prestamos, esperas, recientes, avisos]);

  const disponibles = useCallback(
    (libro: Libro): number => {
      const activos = prestamos.filter(
        (prestamo) => prestamo.isbn === libro.isbn,
      ).length;
      return Math.max(0, libro.ejemplares - activos);
    },
    [prestamos],
  );

  const posicionEnEspera = useCallback(
    (isbn: string): number | null => {
      const lista = esperas[isbn] ?? [];
      const indice = lista.indexOf(NOMBRE_ALUMNO);
      return indice === -1 ? null : indice + 1;
    },
    [esperas],
  );

  const yaReservado = useCallback(
    (isbn: string): boolean => {
      const enPrestamo = prestamos.some(
        (prestamo) => prestamo.isbn === isbn,
      );
      return enPrestamo || posicionEnEspera(isbn) !== null;
    },
    [prestamos, posicionEnEspera],
  );

  const agregarReciente = useCallback((libro: Libro) => {
    setRecientes((previos) => {
      const pila = new Pila<Libro>(previos);
      if (pila.tope?.isbn === libro.isbn) {
        return previos;
      }
      pila.apilar(libro);
      return pila.aArray().slice(0, MAX_RECIENTES);
    });
  }, []);

  const reservar = useCallback(
    (libro: Libro): ResultadoReserva => {
      if (yaReservado(libro.isbn)) {
        return { ok: false, motivo: 'ya-reservado' };
      }
      if (disponibles(libro) > 0) {
        setPrestamos((previos) => [crearPrestamo(libro.isbn), ...previos]);
        return { ok: true, tipo: 'prestamo' };
      }
      const cola = new Cola<string>(esperas[libro.isbn] ?? []);
      cola.encolar(NOMBRE_ALUMNO);
      const lista = cola.aArray();
      setEsperas((previas) => ({ ...previas, [libro.isbn]: lista }));
      return { ok: true, tipo: 'espera', posicion: lista.length };
    },
    [disponibles, esperas, yaReservado],
  );

  const devolver = useCallback(
    async (isbn: string): Promise<void> => {
      const prestamo = prestamos.find((activo) => activo.isbn === isbn);
      await cancelarRecordatorioAsync(prestamo?.notificacionId ?? null);
      setPrestamos((previos) =>
        previos.filter((activo) => activo.isbn !== isbn),
      );
    },
    [prestamos],
  );

  const alternarRecordatorio = useCallback(
    async (
      isbn: string,
      activar: boolean,
    ): Promise<ResultadoRecordatorio> => {
      const prestamo = prestamos.find((activo) => activo.isbn === isbn);
      const libro = buscarLibro(isbn);
      if (!prestamo || !libro) {
        return { activo: false, permisoDenegado: false };
      }
      if (!activar) {
        await cancelarRecordatorioAsync(prestamo.notificacionId);
        setPrestamos((previos) =>
          previos.map((activo) =>
            activo.isbn === isbn
              ? {
                  ...activo,
                  recordatorioActivo: false,
                  notificacionId: null,
                }
              : activo,
          ),
        );
        return { activo: false, permisoDenegado: false };
      }
      const notificacionId = await activarRecordatorioAsync(libro.titulo);
      if (!notificacionId) {
        setPrestamos((previos) =>
          previos.map((activo) =>
            activo.isbn === isbn
              ? {
                  ...activo,
                  recordatorioActivo: false,
                  notificacionId: null,
                }
              : activo,
          ),
        );
        setAvisos((previos) => [
          crearAviso(
            `No pudimos activar el recordatorio de “${libro.titulo}”: las notificaciones están bloqueadas. Te vamos a avisar acá dentro.`,
          ),
          ...previos,
        ]);
        return { activo: false, permisoDenegado: true };
      }
      await cancelarRecordatorioAsync(prestamo.notificacionId);
      setPrestamos((previos) =>
        previos.map((activo) =>
          activo.isbn === isbn
            ? {
                ...activo,
                recordatorioActivo: true,
                notificacionId,
              }
            : activo,
        ),
      );
      return { activo: true, permisoDenegado: false };
    },
    [prestamos],
  );

  const entregarSiguiente = useCallback(
    async (libro: Libro): Promise<EntregaMostrador | null> => {
      const lista = esperas[libro.isbn] ?? [];
      if (lista.length === 0) {
        return null;
      }
      const cola = new Cola<string>(lista);
      const persona = cola.desencolar();
      if (!persona) {
        return null;
      }
      const resto = cola.aArray();
      setEsperas((previas) => {
        const copia: Record<string, string[]> = { ...previas };
        if (resto.length > 0) {
          copia[libro.isbn] = resto;
        } else {
          delete copia[libro.isbn];
        }
        return copia;
      });
      const esParaMi = persona === NOMBRE_ALUMNO;
      if (!esParaMi) {
        return { persona, esParaMi, notificado: false };
      }
      setPrestamos((previos) => [crearPrestamo(libro.isbn), ...previos]);
      const notificado = await avisarReservaListaAsync(libro.titulo);
      if (!notificado) {
        setAvisos((previos) => [
          crearAviso(
            `Tu reserva de “${libro.titulo}” está lista para retirar en el mostrador.`,
          ),
          ...previos,
        ]);
      }
      return { persona, esParaMi, notificado };
    },
    [esperas],
  );

  const iniciarSesion = useCallback(
    (usuario: string, clave: string): boolean => {
      const valido =
        usuario.trim().toLowerCase() === USUARIO_PERSONAL &&
        clave === CLAVE_PERSONAL;
      if (valido) {
        setSesion(true);
      }
      return valido;
    },
    [],
  );

  const cerrarSesion = useCallback(() => {
    setSesion(false);
  }, []);

  const descartarAviso = useCallback((id: string) => {
    setAvisos((previos) => previos.filter((aviso) => aviso.id !== id));
  }, []);

  const valor = useMemo<ContextoBiblioteca>(
    () => ({
      hidratando,
      prestamos,
      esperas,
      recientes,
      avisos,
      sesion,
      disponibles,
      posicionEnEspera,
      yaReservado,
      agregarReciente,
      reservar,
      devolver,
      alternarRecordatorio,
      entregarSiguiente,
      iniciarSesion,
      cerrarSesion,
      descartarAviso,
    }),
    [
      hidratando,
      prestamos,
      esperas,
      recientes,
      avisos,
      sesion,
      disponibles,
      posicionEnEspera,
      yaReservado,
      agregarReciente,
      reservar,
      devolver,
      alternarRecordatorio,
      entregarSiguiente,
      iniciarSesion,
      cerrarSesion,
      descartarAviso,
    ],
  );

  return (
    <BibliotecaContexto.Provider value={valor}>
      {children}
    </BibliotecaContexto.Provider>
  );
}

export function useBiblioteca(): ContextoBiblioteca {
  const contexto = useContext(BibliotecaContexto);
  if (!contexto) {
    throw new Error('useBiblioteca se usa dentro de BibliotecaProvider');
  }
  return contexto;
}
