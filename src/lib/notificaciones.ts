import {
  AndroidImportance,
  SchedulableTriggerInputTypes,
  cancelScheduledNotificationAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { CANAL_PRESTAMOS, SEGUNDOS_RECORDATORIO } from '../constants/biblioteca';

setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function prepararCanalAsync(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await setNotificationChannelAsync(CANAL_PRESTAMOS, {
    name: 'Recordatorios de préstamos',
    importance: AndroidImportance.DEFAULT,
  }).catch(() => undefined);
}

export async function activarRecordatorioAsync(
  titulo: string,
): Promise<string | null> {
  try {
    await prepararCanalAsync();
    const actual = await getPermissionsAsync();
    let concedido = actual.granted;
    if (!concedido && actual.canAskAgain) {
      const pedido = await requestPermissionsAsync();
      concedido = pedido.granted;
    }
    if (!concedido) {
      return null;
    }
    return await scheduleNotificationAsync({
      content: {
        title: 'Devolvé tu libro',
        body: `Acordate de devolver “${titulo}” antes de la fecha límite.`,
        sound: 'default',
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: SEGUNDOS_RECORDATORIO,
        channelId: CANAL_PRESTAMOS,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelarRecordatorioAsync(
  id: string | null,
): Promise<void> {
  if (!id) {
    return;
  }
  await cancelScheduledNotificationAsync(id).catch(() => undefined);
}

export async function avisarReservaListaAsync(
  titulo: string,
): Promise<boolean> {
  try {
    const permiso = await getPermissionsAsync();
    if (!permiso.granted) {
      return false;
    }
    await prepararCanalAsync();
    await scheduleNotificationAsync({
      content: {
        title: 'Tu reserva está lista',
        body: `Te guardamos “${titulo}” en el mostrador de la biblioteca.`,
        sound: 'default',
      },
      trigger: Platform.OS === 'android' ? { channelId: CANAL_PRESTAMOS } : null,
    });
    return true;
  } catch {
    return false;
  }
}
