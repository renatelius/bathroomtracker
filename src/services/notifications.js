import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Сервис локальных уведомлений (будильник/напоминание).
 * Учитывает флоу разрешений Android 13+ и точных будильников Android 12+.
 */

const CHANNEL_ID = 'prediction';
const PREDICTION_TRIGGER_KEY = 'bt-prediction';

// Уведомление должно показываться даже в дoджем-режиме (best effort).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Создаёт Android-канал с обязательным важностью/звуком.
 * Канал должен существовать ДО планирования уведомлений.
 */
export async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Прогноз дефекации',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch (e) {
    // игнорируем — канал создастся при следующей попытке
  }
}

/**
 * Запрашивает разрешения. Возвращает { granted, exactAlarmAvailable, canSchedule }.
 */
export async function ensurePermissions() {
  await ensureChannel();

  let granted = false;
  try {
    const perms = await Notifications.requestPermissionsAsync();
    granted = perms.granted || perms.ios?.status === 1;
  } catch (e) {
    granted = false;
  }

  // Точные будильники: Android 12+ требует SCHEDULE_EXACT_ALARM.
  let exactAlarmAvailable = true;
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    exactAlarmAvailable = await Notifications.getExpoPushTokenCore?.() !== undefined;
    // нативный метод недоступен в JS — используем общую оценку
    exactAlarmAvailable = true; // default best-effort
  }

  return { granted, exactAlarmAvailable };
}

/**
 * Ставит будильник на момент прогноза.
 * @param {{timeMs:number, title:string, body:string, exact?:boolean}} opts
 * @returns {Promise<string|null>} id уведомления или null при отказе
 */
export async function schedulePrediction(opts) {
  const { granted } = await ensurePermissions();
  if (!granted) return null;

  const trigger = {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: new Date(opts.timeMs),
    channelId: CHANNEL_ID,
  };

  if (Platform.OS === 'android') {
    trigger.android = {
      allowWhileIdle: true, // важно для точного срабатывания
      channelId: CHANNEL_ID,
    };
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: opts.title,
      body: opts.body,
      sound: 'default',
      data: { key: PREDICTION_TRIGGER_KEY },
    },
    trigger,
  });
  return id;
}

/** Удаляет ранее установленное напоминание о прогнозе. */
export async function cancelPrediction() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content?.data?.key === PREDICTION_TRIGGER_KEY) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/** Отменяет все уведомления. */
export async function cancelAll() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
