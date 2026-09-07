/**
 * Supabase-клиент с runtime-конфигурацией.
 *
 * URL проекта и anon-ключ НЕ хардкодятся в коде (чтобы не светить их в git)
 * — они вводятся пользователем в экране синхронизации и хранятся в
 * SecureStore (native) / localStorage (web-фолбэк), как ключи AI в vision.js.
 *
 * Клиент создаётся лениво (createClient) только после настройки конфига.
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  url: '@bathroom_tracker_sb_url',
  anon: '@bathroom_tracker_sb_anon',
};

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
  async delete(name) {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.removeItem(name);
      } catch (e) {
        /* ignore */
      }
      return;
    }
    await SecureStore.deleteItemAsync(name);
  },
};

let client = null;

async function loadConfig() {
  const url = await store.get(KEYS.url);
  const anon = await store.get(KEYS.anon);
  return { url, anon };
}

/** Текущая конфигурация: { url, anon } (может содержать пустые строки). */
export async function getSupabaseConfig() {
  return loadConfig();
}

/** Конфигурирует Supabase. Пустой url/anon сбрасывает клиент. */
export async function setSupabaseConfig({ url, anon } = {}) {
  await store.set(KEYS.url, (url || '').trim());
  await store.set(KEYS.anon, (anon || '').trim());
  client = null;
}

/** Настроен ли Supabase (заполнены URL и ключ, и это не плейсхолдер). */
export async function isSupabaseConfigured() {
  const c = await loadConfig();
  return Boolean(
    c.url &&
      c.anon &&
      !c.url.includes('YOUR_PROJECT') &&
      !c.anon.includes('YOUR_ANON')
  );
}

/**
 * Возвращает клиент Supabase (лениво созданный) или null, если не настроен.
 * Сессия хранится в том же безопасном хранилище (native SecureStore / web).
 */
export async function getSupabaseClient() {
  if (!(await isSupabaseConfigured())) return null;
  if (!client) {
    const c = await loadConfig();
    client = createClient(c.url, c.anon, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: {
          getItem: (key) => store.get(key),
          setItem: (key, value) => store.set(key, value),
          removeItem: (key) => store.delete(key),
        },
      },
    });
  }
  return client;
}

/** Сбрасывает кэш клиента (после изменения конфига или выхода). */
export function resetSupabaseClient() {
  client = null;
}