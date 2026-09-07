/**
 * БathroomTracker — геймификация: XP, уровни и ачивки.
 *
 * В отличие от инкрементальных апдейтов статистики, здесь статистика
 * каждый раз пересчитывается из реальных данных хранилища, поэтому
 * условия всегда честны (в т.ч. для старых записей/импорта).
 */
import { Alert } from 'react-native';
import { storageBackend, dayKey } from '../store/storage';
import { bestStreak } from '../model/progression.mjs';

const PROGRESS_KEY = 'bt.achievements';

// ----------------- Каталог ачивок -----------------

export const ACHIEVEMENTS = [
  {
    id: 'first_step',
    title: '👶 Первые шаги',
    description: 'Сделай первую запись в трекер',
    xp: 50,
    rarity: 'common',
    check: (s) => s.totalEntries >= 1,
  },
  {
    id: 'regular',
    title: '📅 Регулярный',
    description: 'Записывайся 7 дней подряд (лучшая серия)',
    xp: 150,
    rarity: 'common',
    check: (s) => s.bestStreak >= 7,
  },
  {
    id: 'hydrator',
    title: '💧 Гидратор',
    description: 'Выпей 8 стаканов воды за день',
    xp: 100,
    rarity: 'common',
    check: (s) => s.maxWaterInDay >= 8,
  },
  {
    id: 'explorer',
    title: '🍽 Исследователь',
    description: 'Попробуй 10 разных блюд',
    xp: 200,
    rarity: 'rare',
    check: (s) => s.uniqueFoods >= 10,
  },
  {
    id: 'iron_rhythm',
    title: '🎯 Железный ритм',
    description: 'Интервалы совпадают с прогнозом 5 раз подряд',
    xp: 300,
    rarity: 'rare',
    check: (s) => s.predictionHits >= 5,
  },
  {
    id: 'marathoner',
    title: '🏃 Марафонец',
    description: '30 дней использования',
    xp: 500,
    rarity: 'epic',
    check: (s) => s.totalDays >= 30,
  },
  {
    id: 'zen',
    title: '🧘 Дзен',
    description: '7 дней с низким стрессом (≤2)',
    xp: 250,
    rarity: 'rare',
    check: (s) => s.calmDays >= 7,
  },
  {
    id: 'gourmet',
    title: '🍣 Гурман',
    description: 'Попробуй 50 разных блюд',
    xp: 750,
    rarity: 'legendary',
    check: (s) => s.uniqueFoods >= 50,
  },
];

export const RARITIES = ['common', 'rare', 'epic', 'legendary'];

// ----------------- Прогресс -----------------

const EMPTY_STATS = {
  totalEntries: 0,
  bestStreak: 0,
  maxWaterInDay: 0,
  uniqueFoods: 0,
  predictionHits: 0,
  totalDays: 0,
  calmDays: 0,
};

const EMPTY_PROGRESS = { xp: 0, level: 1, unlocked: [], stats: { ...EMPTY_STATS } };

export async function getProgress() {
  try {
    const raw = await storageBackend.getItem(PROGRESS_KEY);
    if (!raw) return { ...EMPTY_PROGRESS, stats: { ...EMPTY_STATS } };
    const parsed = JSON.parse(raw);
    return {
      xp: Number(parsed.xp) || 0,
      unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked : [],
      stats: { ...EMPTY_STATS, ...(parsed.stats || {}) },
    };
  } catch (e) {
    console.error('Ошибка загрузки прогресса:', e);
    return { ...EMPTY_PROGRESS, stats: { ...EMPTY_STATS } };
  }
}

export async function saveProgress(progress) {
  try {
    await storageBackend.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch (e) {
    console.error('Ошибка сохранения прогресса:', e);
    return false;
  }
}

// ----------------- Уровни -----------------

export function calculateLevel(xp) {
  return 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 100));
}

export function xpToNextLevel(xp) {
  const currentLevel = calculateLevel(xp);
  const nextLevelXp = Math.pow(currentLevel, 2) * 100;
  const currentLevelXp = Math.pow(currentLevel - 1, 2) * 100;
  const needed = Math.max(1, nextLevelXp - currentLevelXp);
  const current = Math.max(0, xp - currentLevelXp);
  return {
    current: Math.round(current),
    needed: Math.round(needed),
    percent: Math.max(0, Math.min(100, (current / needed) * 100)),
  };
}

// ----------------- Пересчёт статистики из реальных данных -----------------

/** Ключ дня единый с хранилищем: см. dayKey() в src/store/storage.js. */

/** Сколько раз интервал попал в «окно» прогноза (скользящее окно из 5). */
function computePredictionHits(intervalsH) {
  const REQ = 5;
  if (intervalsH.length < REQ) return 0;
  let best = 0;
  let run = 0;
  for (let i = REQ; i < intervalsH.length; i++) {
    const prev = intervalsH.slice(i - REQ, i);
    const m = prev.reduce((a, b) => a + b, 0) / REQ;
    let s = Math.sqrt(prev.reduce((a, v) => a + (v - m) ** 2, 0) / REQ);
    if (s === 0) s = m * 0.25;
    if (Math.abs(intervalsH[i] - m) <= s) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

export async function aggregateStats() {
  const [defecations, meals, dailyMap] = await Promise.all([
    storageBackend.getItem('bt.defecations').then((r) => (r ? JSON.parse(r) : [])),
    storageBackend.getItem('bt.meals').then((r) => (r ? JSON.parse(r) : [])),
    storageBackend.getItem('bt.daily').then((r) => (r ? JSON.parse(r) : {})),
  ]);

  const defs = Array.isArray(defecations) ? defecations : [];
  const list = Array.isArray(meals) ? meals : [];

  const defTimes = defs
    .filter((d) => d && d.timeMs)
    .map((d) => ({ timeMs: d.timeMs }));

  const allTimes = [
    ...defTimes.map((d) => d.timeMs),
    ...list.map((m) => m && m.timeMs).filter(Boolean),
  ];

  const days = new Set(allTimes.map(dayKey));
  for (const key of Object.keys(dailyMap)) {
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(key)) days.add(key);
  }

  let maxWaterInDay = 0;
  let calmDays = 0;
  for (const key of Object.keys(dailyMap)) {
    const row = dailyMap[key] || {};
    if (Number.isFinite(row.waterGlasses)) {
      maxWaterInDay = Math.max(maxWaterInDay, row.waterGlasses);
    }
    if (row.stressLevel != null && row.stressLevel <= 2) calmDays += 1;
  }

  const uniqueFoods = new Set(
    list.map((m) => m && typeof m.name === 'string' && m.name.trim())
      .filter(Boolean)
      .map((n) => n.toLowerCase())
  ).size;

  const intervalsH = [];
  const times = defTimes.map((d) => d.timeMs).sort((a, b) => a - b);
  for (let i = 1; i < times.length; i++) {
    intervalsH.push((times[i] - times[i - 1]) / 3600e3);
  }

  return {
    totalEntries: defTimes.length + list.length,
    bestStreak: bestStreak(defTimes),
    maxWaterInDay,
    uniqueFoods,
    predictionHits: computePredictionHits(intervalsH),
    totalDays: days.size,
    calmDays,
  };
}

// ----------------- Проверка и награды -----------------

/** Пересчитывает статистику, начисляет новые ачивки и сохраняет прогресс. */
async function evaluateAchievements() {
  const progress = await getProgress();
  const stats = await aggregateStats();
  progress.stats = stats;

  const fresh = [];
  for (const ach of ACHIEVEMENTS) {
    if (progress.unlocked.includes(ach.id)) continue;
    if (ach.check(stats)) {
      progress.unlocked.push(ach.id);
      progress.xp += ach.xp;
      progress.level = calculateLevel(progress.xp);
      fresh.push(ach);
    }
  }

  if (fresh.length > 0) {
    await saveProgress(progress);
  }
  return { progress, fresh };
}

/**
 * Пересчитывает статистику и начисляет новые ачивки.
 * @returns {Promise<Object>} актуальный прогресс (со статистикой)
 */
export async function checkAndAwardAchievements() {
  const { progress } = await evaluateAchievements();
  return progress;
}

/**
 * Проверка + уведомление пользователя о новых ачивках.
 * Вызывается fire-and-forget после действий (запись, еда, вода/стресс).
 */
export async function runAchievementCheck() {
  try {
    const { fresh } = await evaluateAchievements();
    if (!fresh.length) return;
    const lines = fresh
      .slice(0, 3)
      .map((a) => `${a.title}  +${a.xp} XP`)
      .join('\n');
    Alert.alert(
      '🏆 Новая ачивка!',
      fresh.length > 1 ? `Открыто сразу несколько:\n\n${lines}` : `${lines}`,
      [{ text: 'Круто! 🎉' }]
    );
  } catch (e) {
    console.error('Ошибка проверки ачивок:', e);
  }
}