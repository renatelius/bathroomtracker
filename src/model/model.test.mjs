import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  predict,
  bodyFactor,
  foodFactor,
  rhythmFactor,
  baseFactor,
} from './model.mjs';
import {
  computeStreak,
  bestStreak,
  computeStats,
  computeMilestones,
  COUNT_MILESTONES,
} from './progression.mjs';

const H = 3600e3;
const now = new Date('2026-01-01T12:00:00').getTime();

test('baseFactor: дефолт при пустой истории', () => {
  assert.equal(baseFactor([]), 28);
});

test('baseFactor: одна запись -> дефолт', () => {
  assert.equal(baseFactor([30]), 28);
});

test('baseFactor: медиана при малой выборке', () => {
  assert.equal(baseFactor([24, 30]), 27);
});

test('baseFactor: выбросы не разрушают EMA', () => {
  const vals = [24, 26, 25, 500, 27, 25, 24, 26]; // 500 — выброс
  const res = baseFactor(vals);
  assert.ok(res > 20 && res < 40, `res=${res}`);
});

test('bodyFactor: женский пол замедляет, мужской нет', () => {
  const f = bodyFactor({ sex: 'female', heightCm: 170, weightKg: 70, birthYear: 1990 }, now);
  const m = bodyFactor({ sex: 'male', heightCm: 180, weightKg: 80, birthYear: 1990 }, now);
  assert.ok(f > m, `f=${f}, m=${m}`);
});

test('bodyFactor: высокий ИМТ замедляет', () => {
  const thin = bodyFactor({ heightCm: 180, weightKg: 60 }, now);
  const heavy = bodyFactor({ heightCm: 170, weightKg: 110 }, now);
  assert.ok(heavy > thin, `heavy=${heavy}, thin=${thin}`);
});

test('bodyFactor: гиперстеник > астеник', () => {
  const a = bodyFactor({ bodyType: 'asthenic' }, now);
  const h = bodyFactor({ bodyType: 'hypersthenic' }, now);
  assert.ok(h > a);
});

test('foodFactor: еды больше нормы -> ускоряет', () => {
  const profile = { sex: 'male', weightKg: 80 }; // норма 2400 ккал/48ч
  const heavyMeals = [
    { timeMs: now - 10 * H, kcal: 2000 },
    { timeMs: now - 2 * H, kcal: 1500 }, // плотный, в хвосте
  ];
  const res = foodFactor(heavyMeals, profile, now);
  assert.ok(res < 1, `res=${res}`);
});

test('foodFactor: пусто -> влияет только хвост или 1', () => {
  const profile = { sex: 'male', weightKg: 80 };
  const res = foodFactor([], profile, now);
  assert.equal(res, 1);
});

test('rhythmFactor: близко к привычному часу -> ускоряет', () => {
  const hours = [8, 9, 8, 9, 8];
  assert.equal(rhythmFactor(hours, 8), 0.92);
  assert.equal(rhythmFactor(hours, 20), 1.05);
});

test('predict: история из интервалов -> реалистичный интервал', () => {
  // 8 записей дают 7 интервалов — режим history (EMA)
  const defecations = [];
  for (let i = 8; i >= 1; i--) {
    defecations.push({ timeMs: now - i * 24 * H });
  }
  const res = predict({
    defecations,
    meals: [],
    profile: { sex: 'male', heightCm: 180, weightKg: 80, birthYear: 1990 },
    nowMs: now,
  });
  assert.ok(res.intervalH > 20 && res.intervalH < 30, `interval=${res.intervalH}`);
  assert.ok(res.predictedAtMs > now);
  assert.ok(res.lowMs <= res.highMs);
  assert.equal(res.source, 'history');
});

test('predict: пустая история -> дефолт + физиологические факторы', () => {
  const res = predict({
    defecations: [],
    meals: [],
    profile: { sex: 'female', heightCm: 165, weightKg: 70, birthYear: 1970 },
    nowMs: now,
  });
  assert.equal(res.source, 'default');
  assert.ok(res.predictedAtMs > now);
});

// ---------------- Прогрессия ----------------

// Локальный полдень в заданный день месяца (jan 2026), чтобы даты были стабильны в любом TZ.
function day(dayNum) {
  return new Date(2026, 0, dayNum, 12).getTime();
}

test('progression: серия как последовательные дни', () => {
  // today = 10 янв; записи 8,9,10 янв (все три подряд вплоть до сегодня).
  const streak = computeStreak(
    [{ timeMs: day(8) }, { timeMs: day(9) }, { timeMs: day(10) }],
    { nowMs: day(10) }
  );
  assert.equal(streak, 3);
});

test('progression: серия жива, если вчера записанo, а сегодня ещё нет', () => {
  const streak = computeStreak(
    [{ timeMs: day(9) }, { timeMs: day(8) }],
    { nowMs: day(10) } // 10 сегодня, записей только 8,9
  );
  assert.equal(streak, 2);
});

test('progression: серия сломана при пропуске больше 1 дня', () => {
  const streak = computeStreak([{ timeMs: day(6) }], { nowMs: day(9) });
  assert.equal(streak, 0);
});

test('progression: пустая история -> серия 0 и нет достижений', () => {
  assert.equal(computeStreak([], { nowMs: day(10) }), 0);
  const m = computeMilestones([], { nowMs: day(10) });
  assert.ok(m.every((x) => x.done === false));
});

test('progression: bestStreak находит самый длинный отрезок', () => {
  // записи: 1,2,3 (3 дня), затем пропуск, затем 7,8 (2 дня)
  const df = [
    { timeMs: day(1) },
    { timeMs: day(2) },
    { timeMs: day(3) },
    { timeMs: day(7) },
    { timeMs: day(8) },
  ];
  assert.equal(bestStreak(df), 3);
});

test('progression: статистика считает консистентность и интервалы', () => {
  const df = [
    { timeMs: day(1) },
    { timeMs: day(2) },
    { timeMs: day(3) },
  ];
  const s = computeStats(df, { nowMs: day(3) });
  assert.equal(s.totalCount, 3);
  assert.equal(s.activeDays, 3);
  assert.equal(s.consistencyPct, 100);
  assert.ok(s.avgIntervalH > 0);
});

test('progression: достижения по количеству записей открываются по порогам', () => {
  const m = computeMilestones(
    Array.from({ length: 10 }, (_, i) => ({ timeMs: day(1 + i) })),
    { nowMs: day(12) }
  );
  const byId = Object.fromEntries(m.map((x) => [x.id, x.done]));
  assert.equal(byId.first, true);
  assert.equal(byId.ten, true);
  assert.equal(byId.twentyfive, false);
  assert.equal(COUNT_MILESTONES.length, 5);
});

