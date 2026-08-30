/**
 * Слой хранилища с абстракцией над бэкендом.
 * Сейчас — AsyncStorage. Чтобы заменить на SQLite/Realm — достаточно
 * реализовать тот же интерфейс в storageBackend.
 */

// Абстрактный бэкенд-контракт:
//   getItem(key) -> Promise<string|null>
//   setItem(key, value) -> Promise<void>
//   removeItem(key) -> Promise<void>

import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageBackend = AsyncStorage;

const KEYS = {
  profile: 'bt.profile',
  meals: 'bt.meals',
  defecations: 'bt.defecations',
  settings: 'bt.settings',
};

const DEFAULT_SETTINGS = {
  alarmEnabled: false,
  alarmLeadMinutes: 10,
  calendarEnabled: false,
  alarmMode: 'notification', // 'notification' | 'system'
};

async function readJSON(key, fallback) {
  try {
    const raw = await storageBackend.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

async function writeJSON(key, value) {
  await storageBackend.setItem(key, JSON.stringify(value));
}

// ---------------- Профиль ----------------

export async function getProfile() {
  return readJSON(KEYS.profile, null);
}

export async function saveProfile(profile) {
  await writeJSON(KEYS.profile, profile);
  return profile;
}

// ---------------- Приёмы пищи ----------------

export async function getMeals() {
  const list = await readJSON(KEYS.meals, []);
  return Array.isArray(list) ? list : [];
}

export async function addMeal(meal) {
  const list = await getMeals();
  list.push(meal);
  await writeJSON(KEYS.meals, list);
  return list;
}

export async function removeMeal(id) {
  const list = (await getMeals()).filter((m) => m.id !== id);
  await writeJSON(KEYS.meals, list);
  return list;
}

// ---------------- Дефекации ----------------

export async function getDefecations() {
  const list = await readJSON(KEYS.defecations, []);
  return Array.isArray(list) ? list : [];
}

export async function addDefecation(entry) {
  const list = await getDefecations();
  list.push(entry);
  await writeJSON(KEYS.defecations, list);
  return list;
}

export async function removeDefecation(id) {
  const list = (await getDefecations()).filter((d) => d.id !== id);
  await writeJSON(KEYS.defecations, list);
  return list;
}

// ---------------- Настройки будильника/календаря ----------------

export async function getSettings() {
  const s = await readJSON(KEYS.settings, null);
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}

export async function saveSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await writeJSON(KEYS.settings, next);
  return next;
}

// ---------------- Сброс ----------------

export async function clearAll() {
  await storageBackend.multiRemove([KEYS.profile, KEYS.meals, KEYS.defecations, KEYS.settings]);
}
