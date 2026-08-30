import { schedulePrediction, cancelPrediction } from './notifications';
import { createPredictionEvent, deletePredictionEvent, ensureCalendarPermission } from './calendarService';

/**
 * Единый сервис будильника и календаря.
 * Связывает прогноз модели с настройками пользователя:
 *  - будильник (звук) за N минут до прогноза,
 *  - событие в системном календаре.
 *
 * Уровень "system" (настоящий системный будильник) требует dev-build и
 * зарезервирован: alarmMode='system' пока не реализован в Expo Go.
 */

/**
 * Планирует будильник и/или событие календаря под прогноз.
 * @param {{prediction:any, settings:any}} args
 * @returns {Promise<{alarmId:string|null, calendarId?:string, calendarOk?:boolean}>}
 */
export async function applyReminder({ prediction, settings }) {
  const result = { alarmId: null, calendarOk: false };

  // Будильник (уведомление со звуком) — если включён
  if (settings.alarmEnabled) {
    const when = new Date(prediction.predictedAtMs);
    result.alarmId = await schedulePrediction({
      predictedAtMs: prediction.predictedAtMs,
      leadMinutes: settings.alarmLeadMinutes || 0,
      title: 'Прогноз дефекации',
      body: `По расчётам — примерно ${when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}.`,
    });
  }

  // Событие в системном календаре — если включено
  if (settings.calendarEnabled) {
    const ev = await createPredictionEvent({
      startMs: prediction.predictedAtMs,
      title: 'Прогноз дефекации',
    });
    result.calendarOk = ev.ok;
    if (ev.id) result.calendarId = ev.id;
  }

  return result;
}

/** Отменяет ранее поставленный будильник (не трогает созданные события). */
export async function cancelAlarm() {
  await cancelPrediction();
}

/** Проверяет доступ к календарю (для предварительной проверки в UI). */
export function calendarPermission() {
  return ensureCalendarPermission();
}
