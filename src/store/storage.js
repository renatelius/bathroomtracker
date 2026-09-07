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
import { encrypt, decrypt, isEncryptionEnabled, setEncryptionEnabled, ENC_MARKER } from '../services/encryption';
import { notifyDataChanged } from '../services/dataBus';

/**
 * Зашифрованный бэкенд хранилища: интерфейс AsyncStorage, но записывает
 * значения открыто или через AES-256 (см. encryption.js) в зависимости от
 * флага шифрования. Чтение самонастраивается по маркеру значения.
 */
const encryptedBackend = {
  async getItem(key) {
    const raw = await AsyncStorage.getItem(key);
    if (!raw || typeof raw !== 'string') return raw;
    if (!raw.startsWith(ENC_MARKER)) return raw;
    try {
      return await decrypt(raw);
    } catch (e) {
      console.error(`Не удалось расшифровать ключ "${key}":`, e);
      return null;
    }
  },
  async setItem(key, value) {
    if (await isEncryptionEnabled()) {
      const enc = await encrypt(value);
      await AsyncStorage.setItem(key, enc);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: (key) => AsyncStorage.removeItem(key),
  multiRemove: (keys) => AsyncStorage.multiRemove(keys),
};

export const storageBackend = encryptedBackend;

const KEYS = {
  profile: 'bt.profile',
  meals: 'bt.meals',
  defecations: 'bt.defecations',
  settings: 'bt.settings',
  lang: 'bt.lang',
  dailyFactors: 'bt.daily',
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
  // 🔥 Автосинхронизация (если включена) — fire-and-forget, с дебаунсом.
  notifyDataChanged();
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

// ---------------- Дневные факторы (вода/стресс) ----------------

/** По умолчанию факторы дня нейтральны: вода 0, стресс 3 (норма). */
export const DEFAULT_DAILY_FACTORS = { waterGlasses: 0, stressLevel: 3 };

/** Ключ дня из миллисекунд, например '2026-8-7' (год-месяц-день без паддинга). */
export function dayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Возвращает факторы дня (вода/стресс) для даты. Если данных нет — дефолт.
 * @param {string} key - ключ вида '2026-8-7' (см. dayKey)
 */
export async function getDailyFactors(key) {
  if (!key || typeof key !== 'string') return { ...DEFAULT_DAILY_FACTORS };
  const map = await readJSON(KEYS.dailyFactors, {});
  const row = map && typeof map === 'object' ? map[key] : null;
  return { ...DEFAULT_DAILY_FACTORS, ...(row || {}) };
}

/** Возвращает все сохранённые дневные факторы: { '2026-8-7': {waterGlasses, stressLevel} }. */
export async function getAllDailyFactors() {
  const map = await readJSON(KEYS.dailyFactors, {});
  return map && typeof map === 'object' ? map : {};
}

/**
 * Сохраняет факторы дня (вода/стресс). Частичный патч — остальные поля
 * дня не затирает, другие дни не трогает.
 * @param {string} key - ключ вида '2026-8-7'
 * @param {{waterGlasses?: number, stressLevel?: number}} patch
 */
export async function saveDailyFactors(key, patch) {
  if (!key || typeof key !== 'string') return null;
  const map = await readJSON(KEYS.dailyFactors, {});
  const row = { ...DEFAULT_DAILY_FACTORS, ...(map[key] || {}), ...patch };
  map[key] = row;
  await writeJSON(KEYS.dailyFactors, map);
  return row;
}

// ---------------- Сброс ----------------

export async function clearAll() {
  await storageBackend.multiRemove([
    KEYS.profile, KEYS.meals, KEYS.defecations, KEYS.settings, KEYS.dailyFactors,
    'bt.achievements',
  ]);
}

// ---------------- Шифрование: миграция данных ----------------

/** Все ключи приложения, значение которых подлежит шифрованию. */
const ENCRYPTABLE_KEYS = [
  KEYS.profile,
  KEYS.meals,
  KEYS.defecations,
  KEYS.settings,
  KEYS.lang,
  KEYS.dailyFactors,
  'bt.achievements',
];

function isRawEncrypted(raw) {
  return typeof raw === 'string' && raw.startsWith(ENC_MARKER);
}

/**
 * Включает шифрование: шифрует текущие открытые значения и сохраняет флаг.
 * Идемпотентно — уже зашифрованные значения пропускает.
 */
export async function enableEncryption() {
  try {
    if (!(await isEncryptionEnabled())) {
      for (const key of ENCRYPTABLE_KEYS) {
        const raw = await AsyncStorage.getItem(key);
        if (!raw || isRawEncrypted(raw)) continue;
        const enc = await encrypt(raw);
        await AsyncStorage.setItem(key, enc);
      }
      await setEncryptionEnabled(true);
    }
    return true;
  } catch (e) {
    console.error('Ошибка включения шифрования:', e);
    return false;
  }
}

/**
 * Выключает шифрование: расшифровывает значения и сбрасывает флаг.
 * Открытые значения остаются нетронутыми.
 */
export async function disableEncryption() {
  try {
    if (await isEncryptionEnabled()) {
      for (const key of ENCRYPTABLE_KEYS) {
        const raw = await AsyncStorage.getItem(key);
        if (!raw || !isRawEncrypted(raw)) continue;
        const dec = await decrypt(raw);
        await AsyncStorage.setItem(key, dec);
      }
      await setEncryptionEnabled(false);
    }
    return true;
  } catch (e) {
    console.error('Ошибка выключения шифрования:', e);
    return false;
  }
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
  const [profile, meals, defecations, settings, lang, dailyFactors] = await Promise.all([
    getProfile(),
    getMeals(),
    getDefecations(),
    getSettings(),
    getLang(),
    readJSON(KEYS.dailyFactors, {}),
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
    dailyFactors,
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
  if (json.dailyFactors && typeof json.dailyFactors === 'object') {
    next.dailyFactors = json.dailyFactors;
    apply.push(writeJSON(KEYS.dailyFactors, json.dailyFactors));
  }
  await Promise.all(apply);

  return next;
}
