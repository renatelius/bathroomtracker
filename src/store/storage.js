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
  lang: 'bt.lang',
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

// ---------------- Язык ----------------

export async function getLang() {
  return readJSON(KEYS.lang, null);
}

export async function saveLang(lang) {
  await writeJSON(KEYS.lang, lang);
  return lang;
}

// ---------------- Сброс ----------------

export async function clearAll() {
  await storageBackend.multiRemove([KEYS.profile, KEYS.meals, KEYS.defecations, KEYS.settings]);
}

// ---------------- Сеттеры (для импорта) ----------------

export async function saveMeals(meals) {
  await writeJSON(KEYS.meals, meals);
  return meals;
}

export async function saveDefecations(defecations) {
  await writeJSON(KEYS.defecations, defecations);
  return defecations;
}

// ---------------- Экспорт / импорт (JSON) ----------------

export const DATA_VERSION = 1;

/**
 * Собирает все данные приложения в один JSON-объект (профиль, приёмы пищи,
 * дефекации, настройки, язык). Для резервного копирования и переноса.
 */
export async function exportData() {
  const [profile, meals, defecations, settings, lang] = await Promise.all([
    getProfile(),
    getMeals(),
    getDefecations(),
    getSettings(),
    getLang(),
  ]);
  return {
    app: 'bathroomtracker',
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
    meals,
    defecations,
    settings,
    lang,
  };
}

/**
 * Валидирует и применяет данные из JSON (см. exportData). Опционально
 * заменяет существующие записи (replace) или только восстанавливает
 * недостающее (merge, по умолчанию). Возвращает применённый объект
 * или бросает ошибку при невалидном формате.
 */
export async function importData(json, { replace = false } = {}) {
  if (!json || typeof json !== 'object' || json.app !== 'bathroomtracker') {
    throw new Error('Не удалось распознать файл данных.');
  }

  const next = {};

  if (json.profile && typeof json.profile === 'object') {
    next.profile = json.profile;
  } else if (replace) {
    next.profile = null;
  }

  const meals = Array.isArray(json.meals) ? json.meals : [];
  const defecations = Array.isArray(json.defecations) ? json.defecations : [];

  if (replace) {
    next.meals = meals;
    next.defecations = defecations;
  } else {
    const [curMeals, curDef] = await Promise.all([getMeals(), getDefecations()]);
    const mealIds = new Set(curMeals.map((m) => m && m.id));
    const defIds = new Set(curDef.map((d) => d && d.id));
    next.meals = [...curMeals, ...meals.filter((m) => m && !mealIds.has(m.id))];
    next.defecations = [...curDef, ...defecations.filter((d) => d && !defIds.has(d.id))];
  }

  if (json.settings && typeof json.settings === 'object') {
    next.settings = json.settings;
  }

  const apply = [];
  if ('profile' in next) {
    if (next.profile) apply.push(writeJSON(KEYS.profile, next.profile));
    else apply.push(storageBackend.removeItem(KEYS.profile));
  }
  if ('meals' in next) apply.push(writeJSON(KEYS.meals, next.meals));
  if ('defecations' in next) apply.push(writeJSON(KEYS.defecations, next.defecations));
  if ('settings' in next) apply.push(writeJSON(KEYS.settings, next.settings));
  if (typeof json.lang === 'string') {
    next.lang = json.lang;
    apply.push(writeJSON(KEYS.lang, json.lang));
  }
  await Promise.all(apply);

  return next;
}
