import type { PermissionResponse } from 'expo';

import type { EstadoPermiso } from '../types';

export function estadoDesdePermiso(
  permiso: PermissionResponse | null,
): EstadoPermiso {
  if (!permiso) {
    return 'cargando';
  }
  if (permiso.granted) {
    return 'concedido';
  }
  return permiso.canAskAgain ? 'preguntable' : 'bloqueado';
}
