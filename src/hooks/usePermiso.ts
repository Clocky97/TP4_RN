import { useCameraPermissions } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import type { PermissionResponse } from 'expo';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { prepararCanalAsync } from '../lib/notificaciones';
import { estadoDesdePermiso } from '../lib/permisos';
import type { EstadoPermiso, RecursoPermiso } from '../types';

export type UsePermisoResultado = {
  estado: EstadoPermiso;
  pedir: () => Promise<PermissionResponse>;
  consultar: () => Promise<void>;
  abrirAjustes: () => void;
};

export function usePermiso(recurso: RecursoPermiso): UsePermisoResultado {
  const [camara, pedirCamara, consultarCamara] = useCameraPermissions();
  const [notificaciones, setNotificaciones] =
    useState<PermissionResponse | null>(null);
  const esCamara = recurso === 'camara';

  const consultar = useCallback(async () => {
    if (esCamara) {
      await consultarCamara();
      return;
    }
    const permiso = await Notifications.getPermissionsAsync();
    setNotificaciones(permiso);
  }, [esCamara, consultarCamara]);

  useEffect(() => {
    if (esCamara) {
      return;
    }
    let activo = true;
    void Notifications.getPermissionsAsync().then((permiso) => {
      if (activo) {
        setNotificaciones(permiso);
      }
    });
    return () => {
      activo = false;
    };
  }, [esCamara]);

  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (estadoApp) => {
      if (estadoApp === 'active') {
        void consultar();
      }
    });
    return () => {
      suscripcion.remove();
    };
  }, [consultar]);

  const pedir = useCallback(async () => {
    if (esCamara) {
      return pedirCamara();
    }
    await prepararCanalAsync();
    const permiso = await Notifications.requestPermissionsAsync();
    setNotificaciones(permiso);
    return permiso;
  }, [esCamara, pedirCamara]);

  const abrirAjustes = useCallback(() => {
    void Linking.openSettings();
  }, []);

  return {
    estado: estadoDesdePermiso(esCamara ? camara : notificaciones),
    pedir,
    consultar,
    abrirAjustes,
  };
}
