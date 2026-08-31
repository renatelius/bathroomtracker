/**
 * BathroomTracker — модуль геймификации/прогрессии.
 * Чистый модуль: без зависимостей от React Native, тестируется в Node.
 *
 * Поощряет безопасное, нейтральное поведение: жёсткость ведения дневника,
 * регулярность записей и стабильность ритма. Никакой гонки за частотой.
 */

const DAY_MS = 24 * 3600e3;

/** Локальная дата (YYYY-MM-DD) по мс. */
function dayKey(ms) {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Разница в календарных днях между двумя датами (положительная для b > a). */
function dayDiff(aKey, bKey) {
  const a = new Date(`${aKey}T00:00:00`);
  const b = new Date(`${bKey}T00:00:00`);
  return Math.round((b - a) / DAY_MS);
}

/**
 * Текущая серия (в днях) c записями дефекации.
 * Считается от последнего записанного дня назад по подряд идущим датам.
 * Если последний записанный день — позавчера (а сегодня/вчера пусто), серия = 0.
 * @param {{timeMs:number}[]} defecations
 * @param {{nowMs?:number}} opts
 * @returns {number}
 */
export function computeStreak(defecations, { nowMs = Date.now() } = {}) {
  const days = new Set(
    (defecations || [])
      .map((d) => d && d.timeMs ? dayKey(d.timeMs) : null)
      .filter(Boolean)
  );
  if (days.size === 0) return 0;

  const sortedDays = [...days].sort();
  const today = dayKey(nowMs);
  const last = sortedDays[sortedDays.length - 1];

  // Если последняя запись старше вчера и сегодня ещё пусто — серия сломана.
  const gapFromToday = dayDiff(last, today);
  if (gapFromToday > 1) return 0;

  // Идём назад от последнего записанного дня по подряд идущим.
  let streak = 0;
  const cursorDate = new Date(`${last}T00:00:00`);
  while (true) {
    if (!days.has(dayKey(cursorDate.getTime()))) break;
    streak += 1;
    cursorDate.setDate(cursorDate.getDate() - 1);
  }
  return streak;
}

/**
 * Максимальная серия за всю историю.
 * @param {{timeMs:number}[]} defecations
 * @returns {number}
 */
export function bestStreak(defecations) {
  const days = [...new Set(
    (defecations || [])
      .map((d) => d && d.timeMs ? dayKey(d.timeMs) : null)
      .filter(Boolean)
  )].sort();
  if (days.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (dayDiff(days[i - 1], days[i]) === 1) run += 1;
    else run = 1;
    if (run > best) best = run;
  }
  return best;
}

/**
 * Сводная статистика ритма и ведения дневника.
 * @param {{timeMs:number}[]} defecations
 * @param {{nowMs?:number}} opts
 * @returns {{
 *   totalCount: number,
 *   activeDays: number,
 *   currentStreak: number,
 *   bestStreak: number,
 *   consistencyPct: number,
 *   avgIntervalH: number,
 *   intervalStdH: number,
 *   hasHistory: boolean,
 * }}
 */
export function computeStats(defecations = [], { nowMs = Date.now() } = {}) {
  const times = defecations
    .map((d) => d && d.timeMs ? d.timeMs : null)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  const totalCount = times.length;
  const days = new Set(times.map(dayKey));

  const intervalsH = [];
  for (let i = 1; i < times.length; i++) {
    intervalsH.push((times[i] - times[i - 1]) / 3600e3);
  }

  let consistencyPct = 0;
  if (times.length > 0) {
    const firstKey = dayKey(times[0]);
    const todayKey = dayKey(nowMs);
    const spanDays = Math.max(1, dayDiff(firstKey, todayKey) + 1);
    consistencyPct = Math.round((days.size / spanDays) * 100);
  }

  const avgIntervalH =
    intervalsH.length ? intervalsH.reduce((a, b) => a + b, 0) / intervalsH.length : 0;
  const intervalStdH =
    intervalsH.length >= 2
      ? (() => {
          const m = avgIntervalH;
          return Math.sqrt(intervalsH.reduce((a, v) => a + (v - m) ** 2, 0) / intervalsH.length);
        })()
      : 0;

  return {
    totalCount,
    activeDays: days.size,
    currentStreak: computeStreak(defecations, { nowMs }),
    bestStreak: bestStreak(defecations),
    consistencyPct,
    avgIntervalH: Math.round(avgIntervalH * 100) / 100,
    intervalStdH: Math.round(intervalStdH * 100) / 100,
    hasHistory: totalCount > 0,
  };
}

/** Пороги достижений по количеству записей. */
export const COUNT_MILESTONES = [
  { count: 1, id: 'first', label: 'Первая запись' },
  { count: 10, id: 'ten', label: '10 записей' },
  { count: 25, id: 'twentyfive', label: '25 записей' },
  { count: 50, id: 'fifty', label: '50 записей' },
  { count: 100, id: 'hundred', label: '100 записей' },
];

/** Порог стабильности ритма (часы дисперсии интервалов) — достижение. */
export const REGULARITY_THRESHOLD_H = 12;

/**
 * Доступные достижения (по количеству записей + стабильность ритма).
 * @param {{timeMs:number}[]} defecations
 * @param {{nowMs?:number}} opts
 * @returns {{id:string, label:string, done:boolean}[]}
 */
export function computeMilestones(defecations = [], { nowMs = Date.now() } = {}) {
  const stats = computeStats(defecations, { nowMs });
  return [
    ...COUNT_MILESTONES.map((m) => ({
      id: m.id,
      label: m.label,
      done: stats.totalCount >= m.count,
    })),
    {
      id: 'regularity',
      label: 'Стабильный ритм',
      done: stats.hasHistory && stats.intervalStdH > 0 && stats.intervalStdH <= REGULARITY_THRESHOLD_H,
    },
  ];
}
