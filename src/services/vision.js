/**
 * 🤖 Распознавание еды по фото — реальный AI.
 *
 * Два провайдера:
 *   1. 'openai'      — OpenAI GPT-4o-mini (Vision): максимально точно, платно.
 *   2. 'huggingface' — бесплатная food-классификация на hf-inference.
 *   3. 'mock'        — демо-режим (fallback, без ключей).
 *
 * Ключи и выбранный провайдер хранятся в SecureStore (native) / localStorage
 * (web-fallback) — тем же способом, что и ключ шифрования.
 *
 * Контракт evaluateMealByPhoto(uri) -> {
 *   calories: number,
 *   confidence: 0..1,
 *   items: [{ name, kcal }],
 *   provider: 'mock' | 'openai' | 'huggingface',
 *   note: string|null
 * }
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

const KEYS = {
  provider: '@bathroom_tracker_vision_provider',
  openai: '@bathroom_tracker_openai_key',
  huggingface: '@bathroom_tracker_hf_key',
};

// -------------------- Безопасное хранилище (native SecureStore / web localStorage) --------------------

const store = {
  async get(name) {
    if (Platform.OS === 'web') {
      try {
        return window.localStorage.getItem(name);
      } catch (e) {
        return null;
      }
    }
    return SecureStore.getItemAsync(name);
  },
  async set(name, value) {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.setItem(name, value);
        return true;
      } catch (e) {
        return false;
      }
    }
    await SecureStore.setItemAsync(name, value);
    return true;
  },
};

// -------------------- Настройки провайдера --------------------

export async function getProvider() {
  return (await store.get(KEYS.provider)) || 'mock';
}

export async function setProvider(provider) {
  await store.set(KEYS.provider, provider);
}

export async function getApiKey(provider) {
  const name = provider === 'openai' ? KEYS.openai : KEYS.huggingface;
  return await store.get(name);
}

export async function saveApiKey(provider, key) {
  const name = provider === 'openai' ? KEYS.openai : KEYS.huggingface;
  await store.set(name, (key || '').trim());
}

/** Есть ли ключ хотя бы у одного реального провайдера. */
export async function hasAnyApiKey() {
  const [o, h] = await Promise.all([getApiKey('openai'), getApiKey('huggingface')]);
  return Boolean(o || h);
}

// -------------------- Чтение изображения в base64 --------------------

async function imageToBase64(uri) {
  if (Platform.OS === 'web') {
    // web: качаем blob-URI и читаем как data URL.
    const res = await fetch(uri);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        const comma = dataUrl.indexOf(',');
        resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
      };
      reader.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

// -------------------- OpenAI (GPT-4o-mini Vision) --------------------

async function analyzeWithOpenAI(uri) {
  const apiKey = await getApiKey('openai');
  if (!apiKey) throw new Error('API-ключ OpenAI не настроен. Добавьте его в настройках AI.');

  const base64 = await imageToBase64(uri);
  const prompt =
    'Ты — эксперт-диетолог. Проанализируй фото еды и верни ТОЛЬКО валидный JSON без markdown и пояснений в формате: ' +
    '{"name":"название блюда на русском","calories":число (ккал всей порции),"confidence":0..1,"description":"краткое описание состава"}';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    let msg = `Ошибка OpenAI API (${response.status})`;
    try {
      const err = await response.json();
      if (err && err.error && err.error.message) msg = err.error.message;
    } catch (e) {
      /* ignore */
    }
    throw new Error(msg);
  }

  const data = await response.json();
  const content = data.choices && data.choices[0].message.content;
  const match = String(content || '').match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Не удалось распарсить ответ AI');
  const parsed = JSON.parse(match[0]);

  return {
    name: String(parsed.name || 'Блюдо'),
    calories: Number(parsed.calories) || null,
    confidence: Number(parsed.confidence) || 0,
    description: parsed.description || '',
    provider: 'openai',
  };
}

// -------------------- Hugging Face (бесплатная классификация) --------------------

const HF_CALORIES_100G = {
  pizza: 266, burger: 295, sushi: 150, pasta: 131, salad: 50, soup: 70,
  sandwich: 250, fries: 312, steak: 271, chicken: 239, rice: 130, bread: 265,
  ramen: 130, spaghetti: 158, noodle: 140, meat: 250, fish: 200, egg: 155,
  fruit: 60, vegetable: 40, dessert: 320, cake: 350, pie: 260, curry: 180,
};

async function analyzeWithHuggingFace(uri) {
  const apiKey = await getApiKey('huggingface');
  if (!apiKey) throw new Error('API-токен Hugging Face не настроен. Добавьте его в настройках AI.');

  const base64 = await imageToBase64(uri);
  const response = await fetch('https://api-inference.huggingface.co/models/nateraw/food', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: base64, parameters: { top_k: 3 } }),
  });

  if (!response.ok) {
    let msg = `Ошибка Hugging Face (${response.status})`;
    try {
      const err = await response.json();
      if (err && typeof err.error === 'string') msg = err.error;
    } catch (e) {
      /* ignore */
    }
    throw new Error(msg);
  }

  const predictions = await response.json();
  if (!Array.isArray(predictions) || predictions.length === 0) {
    throw new Error('Не удалось распознать еду на фото');
  }

  const top = predictions[0];
  const label = String((top && top.label) || '').toLowerCase();

  let matched = 'блюдо';
  let per100 = 200;
  for (const [food, cal] of Object.entries(HF_CALORIES_100G)) {
    if (label.includes(food)) {
      matched = food;
      per100 = cal;
      break;
    }
  }

  const calories = Math.round(per100 * 2.5); // стандартная порция ~250 г
  const name = matched.charAt(0).toUpperCase() + matched.slice(1);

  return {
    name,
    calories,
    confidence: Number(top.score) || 0,
    description: `Распознано как ${label} (уверенность ${Math.round((top.score || 0) * 100)}%)`,
    provider: 'huggingface',
  };
}

// -------------------- Мок (демо-режим) --------------------

/** Читает pixels изображения не получится — оставляем детерминированный мок по URI. */
function mockAnalysis(uri) {
  const foods = [
    { name: 'Салат Цезарь', calories: 320 },
    { name: 'Паста болоньезе', calories: 480 },
    { name: 'Куриный суп', calories: 180 },
    { name: 'Бургер с картофелем', calories: 750 },
    { name: 'Суши-сет', calories: 420 },
  ];
  let seed = 0;
  for (let i = 0; i < (uri || '').length; i++) seed = (seed * 31 + uri.charCodeAt(i)) >>> 0;
  const food = foods[seed % foods.length];
  return {
    ...food,
    confidence: 0.75,
    description: 'Демо-анализ. Настройте AI-провайдера в Логе для реальных результатов.',
    provider: 'mock',
  };
}

// -------------------- Главная точка входа --------------------

export async function evaluateMealByPhoto(uri, preferredProvider) {
  let provider = preferredProvider || (await getProvider());

  const needKey = provider === 'openai' || provider === 'huggingface';
  if (needKey) {
    const key = await getApiKey(provider);
    if (!key) provider = 'mock';
  }

  try {
    if (provider === 'openai') return await analyzeWithOpenAI(uri);
    if (provider === 'huggingface') return await analyzeWithHuggingFace(uri);
  } catch (e) {
    // Если реальный провайдер упал, тихо уходим на мок-заглушку.
    console.error('AI-анализ не удался, фолбэк на демо:', e);
    const mock = mockAnalysis(uri);
    return {
      ...mock,
      confidence: mock.confidence,
      note: `Не удалось применить провайдера (${provider}): ${e.message || 'ошибка'}. Возвращён демо-результат.`,
    };
  }

  return mockAnalysis(uri);
}

// -------------------- Расчёт калорий на сервинг (для UI) --------------------

/**
 * Из результата evaluateMealByPhoto - один простой kcal, если items пуст.
 * Возвращает первичную оценку калорий (уже вычисленную провайдером).
 */
export function caloriesOfResult(result) {
  if (!result) return null;
  if (result.calories != null) return result.calories;
  if (result.items && result.items.length) {
    return result.items.reduce((s, it) => s + (it.kcal || 0), 0);
  }
  return null;
}
