/**
 * Крошечная шина событий: оповещает о записи данных (после сохранения в
 * storage). syncService подписывается и запускает автосинхронизацию.
 *
 * Отдельный модуль нужен, чтобы хранилище не импортировало syncService
 * (который обратно импортирует storage) — избегаем циклических зависимостей.
 * Уведомления "огнезабываемые" с дебаунсом: частые записи (вода/стресс)
 * объединяются в один бэкап.
 */

const DEBOUNCE_MS = 2000;

let handler = null;
let timer = null;

/**
 * Регистрирует обработчик изменения данных (он же автосинхронизация).
 * @param {() => void} fn - вызывается не чаще раза в DEBOUNCE_MS.
 */
export function onDataChanged(fn) {
  handler = fn;
}

/** Снимает обработчик (для тестов). */
export function clearDataHandler() {
  handler = null;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

/** Отмечает, что данные изменились (fire-and-forget, с дебаунсом). */
export function notifyDataChanged() {
  if (!handler || timer) return;
  timer = setTimeout(() => {
    timer = null;
    try {
      handler();
    } catch (e) {
      console.error('dataBus: обработчик упал:', e);
    }
  }, DEBOUNCE_MS);
}