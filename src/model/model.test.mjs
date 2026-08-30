import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  predict,
  bodyFactor,
  foodFactor,
  rhythmFactor,
  baseFactor,
} from './model.mjs';

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
