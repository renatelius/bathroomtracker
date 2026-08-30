/**
 * Распознавание калорий по фото приёма пищи.
 *
 * АРХИТЕКТУРА (до реального API):
 * - Здесь определён контракт evaluateMealByPhoto(uri) -> результат оценки.
 * - Реальная интеграция (Vision/LLM, напр. GPT-4o / Gemini / Cloud Vision):
 *   отправляет изображение на сервер, получает { items[], kcal, confidence }.
 * - На данный момент нет API-ключа/бэкенда, поэтому используется mock-заглушка:
 *   детерминированная эвристика по URI + псевдослучайные, но правдоподобные
 *   числа. Подключить реальный провайдер = заменить тело функции ниже.
 *
 * ФОРМАТ РЕЗУЛЬТАТА (контракт):
 * {
 *   calories: number|null,       // суммарная оценка ккал
 *   confidence: 0..1,            // уверенность модели
 *   items: [{ name, kcal }],     // распознанные блюда
 *   provider: 'mock' | 'openai' | 'gemini' | ...,
 *   note: string|null
 * }
 */

// Пороговые значения по числу «блюд» — mock эвристика.
const PORTION_BASE = [180, 320, 460, 620];

/**
 * Принимает локальный URI снимка и возвращает Promise контракта выше.
 * @param {string} uri - file:// uri фото
 */
export async function evaluateMealByPhoto(uri) {
  // --- ТОЧКА ПОДКЛЮЧЕНИЯ РЕАЛЬНОГО API ---
  // if (hasApiKey) return callVisionProvider(uri, apiKey);
  // ----------------------------------------

  // Детерминированный seed из URI -> правдоподобная, воспроизводимая оценка.
  let seed = 0;
  for (let i = 0; i < uri.length; i++) seed = (seed * 31 + uri.charCodeAt(i)) >>> 0;

  const itemCount = 1 + (seed % 3); // 1..3 блюда
  const portions = ['Основное блюдо', 'Гарнир', 'Салат/лёгкое'];

  const items = [];
  for (let i = 0; i < itemCount; i++) {
    const k = (seed >> (i * 5)) & 3;
    const kcal = PORTION_BASE[k] + ((seed >> (i * 7)) % 60);
    items.push({ name: portions[i], kcal });
  }

  const calories = items.reduce((s, it) => s + it.kcal, 0);
  const confidence = 0.45 + ((seed % 100) / 100) * 0.25; // 0.45..0.70

  return {
    calories,
    confidence: Number(confidence.toFixed(2)),
    items,
    provider: 'mock',
    note: 'Оценка по фото (демо). Для точности подключите реальный распознаватель в src/services/vision.js',
  };
}
