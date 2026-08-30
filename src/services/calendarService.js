import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

/**
 * Интеграция с нативным календарём телефона: создание события прогноза.
 * Работает в Expo Go (expo-calendar поддерживается на обеих платформах).
 */

const CALENDAR_TITLE = 'BathroomTracker';

/**
 * Запрашивает разрешение на доступ к календарю.
 * @returns {Promise<boolean>} granted
 */
export async function ensureCalendarPermission() {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    return false;
  }
}

/**
 * Находит или создаёт личный календарь BathroomTracker.
 * @returns {Promise<string|null>} calendarId
 */
async function ensureCalendarId() {
  const calendars = await Calendar.getCalendarsAsync(
    Platform.OS === 'ios' ? Calendar.EntityTypes.EVENT : Calendar.EntityTypes.EVENT
  );

  let cal = calendars.find((c) => c.title === CALENDAR_TITLE);
  if (cal) return cal.id;

  let source = undefined;
  let sourceId = undefined;

  if (Platform.OS === 'ios') {
    // iOS требует ссылку на реальный источник календаря.
    try {
      const defaultSource = await Calendar.getDefaultCalendarSourceAsync();
      source = defaultSource;
      sourceId = defaultSource && defaultSource.id;
    } catch (e) {
      // остаёмся с undefined — создание может не сработать, но не уроним
    }
  }

  const newId = await Calendar.createCalendarAsync({
    title: CALENDAR_TITLE,
    color: '#2f6fed',
    entityType: Calendar.EntityTypes.EVENT,
    sourceId,
    source,
    name: CALENDAR_TITLE,
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
  return newId;
}

/**
 * Создаёт событие прогноза дефекации в системном календаре.
 * Событие «за N минут до» покрывает окно low..high.
 *
 * @param {{startMs:number, durationMin?:number, title?:string, notes?:string}} opts
 * @returns {Promise<{ok:boolean, id?:string, reason?:string}>}
 */
export async function createPredictionEvent(opts) {
  const granted = await ensureCalendarPermission();
  if (!granted) {
    return { ok: false, reason: 'permission_denied' };
  }

  try {
    const calendarId = await ensureCalendarId();
    if (!calendarId) return { ok: false, reason: 'no_calendar' };

    const start = new Date(opts.startMs);
    const end = new Date(opts.startMs + (opts.durationMin || 30) * 60e3);

    const id = await Calendar.createEventAsync(calendarId, {
      title: opts.title || 'Прогноз дефекации',
      startDate: start,
      endDate: end,
      notes: opts.notes || 'Прогноз по приложению BathroomTracker',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    return { ok: true, id };
  } catch (e) {
    return { ok: false, reason: String(e && e.message || e) };
  }
}

/**
 * Удаляет ранее созданное событие прогноза по id.
 */
export async function deletePredictionEvent(id) {
  if (!id) return;
  try {
    await Calendar.deleteEventAsync(id);
  } catch (e) {
    // игнорируем
  }
}
