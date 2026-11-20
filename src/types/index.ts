export type Libro = {
  isbn: string;
  titulo: string;
  autor: string;
  anio: number;
  ejemplares: number;
};

export type Prestamo = {
  isbn: string;
  fechaDevolucion: string;
  recordatorioActivo: boolean;
  notificacionId: string | null;
};

export type Aviso = {
  id: string;
  texto: string;
};

export type EstadoPermiso = 'cargando' | 'concedido' | 'preguntable' | 'bloqueado';

export type RecursoPermiso = 'camara' | 'notificaciones';

export type ResultadoReserva =
  | { ok: true; tipo: 'prestamo' }
  | { ok: true; tipo: 'espera'; posicion: number }
  | { ok: false; motivo: 'ya-reservado' };

export type ResultadoRecordatorio = {
  activo: boolean;
  permisoDenegado: boolean;
};

export type EntregaMostrador = {
  persona: string;
  esParaMi: boolean;
  notificado: boolean;
};
