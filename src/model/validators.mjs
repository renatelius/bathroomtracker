/**
 * 🔒 Валидаторы и предохранители (Этап 7 — Edge Cases).
 * Чистый ESM-модуль: без зависимостей от React Native, тестируется в Node
 * и импортируется как из model.mjs, так и из экранов (Metro/Babel).
 *
 * Защищает модель и хранилище от безумных вводов: отрицательные/NaN/Infinity
 * значения, даты из далёкого будущего/прошлого, задирающиеся калории и т.п.
 */

/**
 * Clamp значения в безопасный диапазон [min, max].
 * Если значение не число, отдаёт default.
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @param {number} [defaultValue=min]
 * @returns {number}
 */
export function clamp(value, min, max, defaultValue = min) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : NaN;
  if (Number.isNaN(n)) return defaultValue;
  return Math.max(min, Math.min(max, n));
}

/**
 * Валидирует калории приёма пищи (0-10000 ккал). Мусор -> 0.
 * @param {unknown} calories
 * @returns {number}
 */
export function validateCalories(calories) {
  return clamp(calories, 0, 10000, 0);
}

/**
 * Валидирует стаканы воды за день (0-20). Мусор -> 0.
 * @param {unknown} glasses
 * @returns {number}
 */
export function validateWaterGlasses(glasses) {
  return clamp(glasses, 0, 20, 0);
}

/**
 * Валидирует уровень стресса (1-5, норма 3). Мусор -> 3.
 * @param {unknown} level
 * @returns {number}
 */
export function validateStressLevel(level) {
  return clamp(level, 1, 5, 3);
}

/**
 * Валидирует дату: не из будущего (-> сегодня), не старше 10 лет
 * (-> 10 лет назад). Невалидную дату -> сегодня.
 * @param {unknown} date
 * @returns {Date}
 */
export function validateDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return new Date();
  }
  const now = new Date();
  const tenYearsAgo = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000);

  if (date.getTime() > now.getTime()) return now;
  if (date.getTime() < tenYearsAgo.getTime()) return tenYearsAgo;
  return date;
}

/**
 * Валидирует вес порции в граммах (0-5000). Мусор -> дефолт 100 г.
 * @param {unknown} weight
 * @returns {number}
 */
export function validatePortionWeight(weight) {
  return clamp(weight, 0, 5000, 100);
}

/**
 * Валидирует базовое время прогноза в часах (1-168 = неделя). Мусор -> 24.
 * @param {unknown} hours
 * @returns {number}
 */
export function validateBaseTime(hours) {
  return clamp(hours, 1, 168, 24);
}

/**
 * Проверяет, не слишком ли большой разрыв между событиями (>30 дней).
 * Возвращает число дней в диапазоне [0, 30]. Мусор -> 0.
 * @param {unknown} days
 * @returns {number}
 */
export function validateGapDays(days) {
  return clamp(days, 0, 30, 0);
}
