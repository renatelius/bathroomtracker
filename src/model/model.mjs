/**
 * BathroomTracker — математическое ядро предсказания дефекации.
 * Чистый модуль: без зависимостей от React Native, тестируется в Node.
 *
 * Модель: T_next = t_last + T_pred
 *   T_pred = F_base × k_body × k_food × k_rhythm
 *
 *   F_base  — базовая длительность интервала из истории
 *   k_body  — телесно-физиологический коэффициент (пол/ИМТ/тип/возраст)
 *   k_food  — пищевой коэффициент (ккал за 48ч против персональной нормы)
 *   k_rhythm— суточный ритм (привычный час дефекации)
 */

// ---------------------------------------------------------------------------
// Константы модели (можно тюнить)
// ---------------------------------------------------------------------------

// Физиологический дефолт при отсутствии истории (часы).
const DEFAULT_INTERVAL_H = 28;

// Физиологические границы интервала (часы) — кламп для малых выборок.
const MIN_INTERVAL_H = 12;
const MAX_INTERVAL_H = 96;

// Валидная история: сколько записей считать "достаточной" для EMA.
const HISTORY_EMA_MIN = 7;
// Для медианного режима достаточно 2 записей.
const HISTORY_MEDIAN_MIN = 2;

// EMA-сглаживание (чем меньше alpha, тем больше вес прошлых интервалов).
const EMA_ALPHA = 0.4;

// Отбрасывание выбросов: интервал дальше чем Z_STD × std считается выбросом.
const OUTLIER_Z = 3;

// Пищевая норма ккал/кг сутки (женщины чуть выше нормы калорийности).
const KCAL_PER_KG = 30;
const KCAL_PER_KG_FEMALE = 28;

// Окно анализа еды перед прогнозом (часы).
const FOOD_WINDOW_H = 48;
// "Хвост" последнего плотного приёма, который стимулирует (часы).
const FOOD_TAIL_H = 8;
// Скорость влияния избытка ккал на ускорение (подбирается эмпирически).
const FOOD_K = 0.15;

// ---------------------------------------------------------------------------
// Телосложение
// ---------------------------------------------------------------------------
const BODY_TYPES = {
  asthenic: 0.94, // астеник
  normostenic: 1.0, // нормостеник
  hypersthenic: 1.06, // гиперстеник
};

// ---------------------------------------------------------------------------
// Вспомогательные функции
// ---------------------------------------------------------------------------

/** Медиана массива чисел. */
function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Среднее арифметическое. */
function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Стандартное отклонение (population). */
function std(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const sq = values.reduce((a, b) => a + (b - m) ** 2, 0);
  return Math.sqrt(sq / values.length);
}

/** Экспоненциально-взвешенное среднее с равномерной последовательностью. */
function ema(values, alpha) {
  if (!values.length) return 0;
  let acc = values[0];
  for (let i = 1; i < values.length; i++) {
    acc = alpha * values[i] + (1 - alpha) * acc;
  }
  return acc;
}

/** Клamp в диапазон [min, max]. */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// ---------------------------------------------------------------------------
// Расчёт коэффициентов
// ---------------------------------------------------------------------------

/**
 * Телесно-физиологический коэффициент k_body.
 * @param {{sex?: 'male'|'female', birthYear?: number, heightCm?: number,
 *          weightKg?: number, bodyType?: keyof typeof BODY_TYPES}} profile
 * @param {number} nowMs - текущее время для расчёта возраста
 * @returns {number}
 */
export function bodyFactor(profile, nowMs = Date.now()) {
  let k = 1;

  if (profile.sex === 'female') k *= 1.05;
  else if (profile.sex === 'male') k *= 1.0;

  // ИМТ
  if (profile.heightCm && profile.weightKg && profile.heightCm > 0) {
    const h = profile.heightCm / 100;
    const bmi = profile.weightKg / (h * h);
    if (bmi < 18.5) k *= 0.9;
    else if (bmi < 25) k *= 1.0;
    else if (bmi < 30) k *= 1.06;
    else k *= 1.12;
  }

  // Тип телосложения
  if (profile.bodyType && BODY_TYPES[profile.bodyType] != null) {
    k *= BODY_TYPES[profile.bodyType];
  }

  // Возраст: старше 50 — лёгкое замедление транзита
  if (profile.birthYear) {
    const age = new Date(nowMs).getFullYear() - profile.birthYear;
    if (age > 50) k *= 1 + (age - 50) * 0.003;
  }

  return k;
}

/**
 * Пищевой коэффициент k_food на основе приёмов пищи за FOOD_WINDOW_H часов.
 * Сравнивает суммарный ккал с персональной нормой (KCAL_PER_KG × вес).
 * Приёмов больше нормы -> стимул (<1, ускоряет); меньше -> замедление (>1).
 *
 * @param {{timeMs: number, kcal: number}[]} meals
 * @param {{sex?: 'male'|'female', weightKg?: number}} profile
 * @param {number} nowMs
 * @returns {number}
 */
export function foodFactor(meals, profile, nowMs = Date.now()) {
  const windowStart = nowMs - FOOD_WINDOW_H * 3600e3;
  const inWindow = (meals || []).filter((m) => m.timeMs >= windowStart && m.timeMs <= nowMs);
  const sumKcal = inWindow.reduce((a, m) => a + (m.kcal || 0), 0);

  // Нет приёмов пищи в окне анализа — нет данных, нейтральный коэффициент.
  if (inWindow.length === 0) return 1;

  const basePerKg = profile.sex === 'female' ? KCAL_PER_KG_FEMALE : KCAL_PER_KG;
  const kcalBase = basePerKg * (profile.weightKg || 70);

  let k = 1;
  if (kcalBase > 0) {
    const ratio = sumKcal / kcalBase;
    k = Math.exp(-FOOD_K * (ratio - 1));
  }

  // Пищевой "хвост": недавний плотный приём (в пределах FOOD_TAIL_H) — стимул
  const tailStart = nowMs - FOOD_TAIL_H * 3600e3;
  const hasRecent = inWindow.some(
    (m) => m.timeMs >= tailStart && (m.kcal || 0) > 300
  );
  if (hasRecent) k *= 0.9;

  return clamp(k, 0.6, 1.6);
}

/**
 * Коэффициент суточного ритма. Если у пользователя есть характерный час
 * дефекации, усиливаем прогноз рядом с ним (небольшой множитель).
 *
 * @param {number[]} hourOfDay - часы (0-23) из истории дефекаций
 * @param {number} predictedHour - час прогнозируемого интервала
 * @returns {number}
 */
export function rhythmFactor(hourOfDay, predictedHour) {
  if (!hourOfDay || hourOfDay.length < 3) return 1;
  const typical = median(hourOfDay);
  const diff = Math.abs(predictedHour - typical);
  // циклическая разница по 24-часовой окружности
  const circular = Math.min(diff, 24 - diff);
  if (circular <= 2) return 0.92; // близко к привычному часу — ускоряем слегка
  if (circular <= 6) return 1.0;
  return 1.05;
}

// ---------------------------------------------------------------------------
// Базовая составляющая F_base
// ---------------------------------------------------------------------------

/**
 * @param {number[]} intervalsH - интервалы между дефекациями (часы), упорядоченные
 * @returns {number}
 */
export function baseFactor(intervalsH) {
  const n = intervalsH.length;

  if (n >= HISTORY_EMA_MIN) {
    // Отбрасываем выбросы (>3σ от медианы), затем EMA.
    const med = median(intervalsH);
    const s = std(intervalsH);
    const clean = intervalsH.filter((v) => Math.abs(v - med) <= OUTLIER_Z * s);
    return ema(clean.length ? clean : intervalsH, EMA_ALPHA);
  }

  if (n >= HISTORY_MEDIAN_MIN) {
    return clamp(median(intervalsH), MIN_INTERVAL_H, MAX_INTERVAL_H);
  }

  // 0 или 1 запись — физиологический дефолт.
  return DEFAULT_INTERVAL_H;
}

// ---------------------------------------------------------------------------
// Главная функция прогноза
// ---------------------------------------------------------------------------

/**
 * Возвращает предсказание следующей дефекации.
 *
 * @param {{
 *   defecations: {timeMs: number}[],
 *   meals: {timeMs: number, kcal: number}[],
 *   profile: {sex?: 'male'|'female', birthYear?: number, heightCm?: number,
 *             weightKg?: number, bodyType?: keyof typeof BODY_TYPES},
 *   nowMs?: number,
 * }} args
 * @returns {{
 *   predictedAtMs: number,
 *   intervalH: number,
 *   lowMs: number,
 *   highMs: number,
 *   confidenceH: number,
 *   source: 'history'|'median'|'default',
 *   factors: {body: number, food: number, rhythm: number, base: number},
 * }}
 */
export function predict(args) {
  const {
    defecations = [],
    meals = [],
    profile = {},
    nowMs = Date.now(),
  } = args;

  // Упорядочиваем и очищаем от дублей/нулевых.
  const times = defecations
    .map((d) => d.timeMs)
    .filter((t) => typeof t === 'number' && t > 0)
    .sort((a, b) => a - b);

  // Интервалы между соседними дефекациями, часы.
  const intervalsH = [];
  for (let i = 1; i < times.length; i++) {
    intervalsH.push((times[i] - times[i - 1]) / 3600e3);
  }

  const base = baseFactor(intervalsH);
  let source = 'default';
  if (intervalsH.length >= HISTORY_EMA_MIN) source = 'history';
  else if (intervalsH.length >= HISTORY_MEDIAN_MIN) source = 'median';

  const kBody = bodyFactor(profile, nowMs);
  const kFood = foodFactor(meals, profile, nowMs);

  const predictedHour = (new Date(nowMs + base * kBody * kFood).getHours());
  const hourOfDay = times.map((t) => new Date(t).getHours());
  const kRhythm = rhythmFactor(hourOfDay, predictedHour);

  const intervalH = clamp(base * kBody * kFood * kRhythm, MIN_INTERVAL_H, MAX_INTERVAL_H);

  // Окно достоверности: ±std интервалов (или физиологическая неопределённость).
  const s = std(intervalsH);
  const confH = s > 0 ? s : DEFAULT_INTERVAL_H * 0.3; // ~±30% от дефолта при пустоте
  const predictedAtMs = nowMs + intervalH * 3600e3;

  return {
    predictedAtMs,
    intervalH: Math.round(intervalH * 100) / 100,
    lowMs: nowMs + Math.max(0, intervalH - confH) * 3600e3,
    highMs: nowMs + (intervalH + confH) * 3600e3,
    confidenceH: Math.round(confH * 100) / 100,
    source,
    factors: {
      body: Math.round(kBody * 1000) / 1000,
      food: Math.round(kFood * 1000) / 1000,
      rhythm: Math.round(kRhythm * 1000) / 1000,
      base: Math.round(base * 100) / 100,
    },
  };
}
