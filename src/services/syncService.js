/**
 * Сервис синхронизации с Supabase (Этап 8).
 *
 * Поток:
 *   1. configure: URL + anon-ключ (см. supabase.js)
 *   2. sign in / sign up (email+password)
 *   3. включить автосинхронизацию с паролем для шифрования
 *   4. uploadBackup — exportData() → E2E-шифрование → upsert в user_backups
 *   5. restoreFromCloud — скачивание → decrypt → importData(replace)
 *
 * Сессия и настройки синка хранятся в безопасном хранилище
 * (SecureStore на native, localStorage на web).
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getSupabaseClient } from './supabase';
import { encryptForCloud, decryptFromCloud } from './cloudEncryption';
import { exportData, importData } from '../store/storage';
import { onDataChanged } from './dataBus';

const SYNC_ENABLED_KEY = '@bathroom_tracker_sync_enabled';
const SYNC_PASSWORD_KEY = '@bathroom_tracker_sync_password';
const LAST_SYNC_KEY = '@bathroom_tracker_last_sync';

const secureStore = {
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

async function requireClient() {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error('Supabase не настроен: укажите URL и anon-ключ в настройках синхронизации.');
  }
  return client;
}

// ---------------- Авторизация ----------------

export async function signUp(email, password) {
  const client = await requireClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const client = await requireClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  try {
    const client = await getSupabaseClient();
    if (client) await client.auth.signOut();
  } catch (e) {
    // даже если сессия протухла — продолжаем локальную очистку
  }
  await secureStore.delete(SYNC_ENABLED_KEY);
  await secureStore.delete(SYNC_PASSWORD_KEY);
}

export async function getCurrentUser() {
  try {
    const client = await requireClient();
    const { data } = await client.auth.getUser();
    return data && data.user ? data.user : null;
  } catch (e) {
    return null;
  }
}

// ---------------- Бэкапы ----------------

/** Скачивает бэкап из облака и расшифровывает паролем. */
export async function downloadBackup(password) {
  const client = await requireClient();
  const { data: userData } = await client.auth.getUser();
  const user = userData && userData.user;
  if (!user) throw new Error('Не авторизован: войдите в аккаунт');

  const { data, error } = await client
    .from('user_backups')
    .select('encrypted_data, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.encrypted_data) {
    throw new Error('Бэкап не найден в облаке');
  }

  const decrypted = await decryptFromCloud(data.encrypted_data, password);
  return {
    data: JSON.parse(decrypted),
    updatedAt: data.updated_at ? new Date(data.updated_at) : null,
  };
}

/** Собирает локальные данные, шифрует и выгружает бэкап в облако. */
export async function uploadBackup(password) {
  const client = await requireClient();
  const { data: userData } = await client.auth.getUser();
  const user = userData && userData.user;
  if (!user) throw new Error('Не авторизован: войдите в аккаунт');

  const localData = await exportData();
  const jsonString = JSON.stringify(localData);
  const encrypted = await encryptForCloud(jsonString, password);

  const { error } = await client.from('user_backups').upsert({
    user_id: user.id,
    encrypted_data: encrypted,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;

  await secureStore.set(LAST_SYNC_KEY, new Date().toISOString());
  return true;
}

/**
 * Восстанавливает данные из облака (заменяет локальные).
 * Возвращает бэкап { data, updatedAt }.
 */
export async function restoreFromCloud(password) {
  const backup = await downloadBackup(password);
  if (!backup.data || typeof backup.data !== 'object' || backup.data.app !== 'bathroomtracker') {
    throw new Error('Бэкап повреждён: не распознан формат данных');
  }
  await importData(backup.data, { replace: true });
  return backup;
}

// ---------------- Параметры синхронизации ----------------

export async function setSyncEnabled(enabled, password = null) {
  await secureStore.set(SYNC_ENABLED_KEY, enabled ? 'true' : 'false');
  if (password) {
    await secureStore.set(SYNC_PASSWORD_KEY, password);
  } else if (enabled && !(await secureStore.get(SYNC_PASSWORD_KEY))) {
    throw new Error('Укажите пароль для шифрования бэкапов');
  }
}

export async function isSyncEnabled() {
  return (await secureStore.get(SYNC_ENABLED_KEY)) === 'true';
}

export async function getStoredSyncPassword() {
  return secureStore.get(SYNC_PASSWORD_KEY);
}

export async function getLastSyncTime() {
  const time = await secureStore.get(LAST_SYNC_KEY);
  return time ? new Date(time) : null;
}

export async function hasEnabledSyncWithPassword() {
  const enabled = await isSyncEnabled();
  if (!enabled) return false;
  const pw = await secureStore.get(SYNC_PASSWORD_KEY);
  return Boolean(pw);
}

// ---------------- Автосинхронизация ----------------

/**
 * Автоматическая синхронизация после изменения данных (см. dataBus).
 * Тихая: все ошибки логируются, но не роняют приложение.
 */
export async function autoSync() {
  if (!(await isSyncEnabled())) return;
  const password = await secureStore.get(SYNC_PASSWORD_KEY);
  if (!password) return;
  try {
    await uploadBackup(password);
    // eslint-disable-next-line no-console
    console.log('✅ Автосинхронизация успешна');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('❌ Ошибка автосинхронизации:', e && e.message ? e.message : e);
  }
}

// Подписываемся на изменения данных при загрузке модуля.
onDataChanged(() => {
  autoSync();
});