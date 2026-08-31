import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { goToLog } from './nav';

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
 * Возвращает текущий статус разрешений, НЕ запрашивая их.
 * Полезно, чтобы не дёргать системный запрос при каждом применении.
 * @returns {Promise<{granted:boolean, status:string}>}
 */
export async function checkNotificationPermission() {
  try {
    const perms = await Notifications.getPermissionsAsync();
    const granted = perms.granted || perms.ios?.status === 1;
    return { granted, status: perms.status };
  } catch (e) {
    return { granted: false, status: 'undetermined' };
  }
}

/**
 * Запрашивает разрешения (или возвращает текущее, если уже определено).
 * Возвращает { granted, exactAlarmAvailable }.
 */
export async function ensurePermissions() {
  await ensureChannel();

  let granted = false;
  const current = await checkNotificationPermission();
  if (current.granted) {
    granted = true;
  } else if (current.status === 'undetermined') {
    // Запрашиваем только если решение ещё не принято пользователем,
    // чтобы не назойливо переспрашивать при каждом применении.
    try {
      const perms = await Notifications.requestPermissionsAsync();
      granted = perms.granted || perms.ios?.status === 1;
    } catch (e) {
      granted = false;
    }
  }

  // Точные будильники: Android 12+ требует SCHEDULE_EXACT_ALARM.
  // В Expo Go нет прямого JS-доступа к этому флагу, поэтому возвращаем
  // консервативно "доступно по умолчанию" (best effort) — без фейковых вызовов.
  let exactAlarmAvailable = true;
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    exactAlarmAvailable = true; // best-effort; может быть недоступно у пользователя
  }

  return { granted, exactAlarmAvailable };
}

/**
 * Ставит будильник, который звонит за `leadMinutes` минут до прогноза.
 * @param {{predictedAtMs:number, leadMinutes?:number, title:string, body:string}} opts
 * @returns {Promise<{id?:string, reason:'ok'|'no_permission'|'too_soon'}>}
 */
export async function schedulePrediction(opts) {
  const { granted } = await ensurePermissions();
  if (!granted) return { reason: 'no_permission' };

  const lead = Math.max(0, opts.leadMinutes || 0);
  const ringAt = new Date(opts.predictedAtMs - lead * 60e3);
  const now = Date.now();

  // Точка звонка уже в прошлом — будильник бессмыслен.
  if (ringAt.getTime() <= now) return { reason: 'too_soon' };

  const trigger = {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: ringAt,
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
      body: lead > 0
        ? `${opts.body} Через ~${lead} мин.`
        : opts.body,
      sound: 'default',
      data: { key: PREDICTION_TRIGGER_KEY },
    },
    trigger,
  });
  return { id, reason: 'ok' };
}

/**
 * Подписывает слушателя на нажатие по уведомлению. По умолчанию
 * переключает на вкладку «Лог», чтобы сразу запиcать акт. На web
 * нажатия по уведомлениям недоступны.
 * Возвращает функцию отписки.
 */
export function onNotificationTap(listener) {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    if (listener) {
      listener(response);
    } else {
      goToLog();
    }
  });
  return () => sub && sub.remove();
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
