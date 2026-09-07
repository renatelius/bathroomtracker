/**
 * Шифрование данных приложения: AES-256-CBC (crypto-js) + случайный IV.
 * Ключ (64 hex = 32 байта) генерируется через expo-crypto и хранится в
 * SecureStore (Keychain/Keystore на нативных платформах). На web SecureStore
 * не работает, поэтому для ключа используется web-фолбэк (localStorage) —
 * полноценный Keychain/Keystore доступен только в собранных нативных билдах.
 *
 * Формат значения:  enc:v1:<IV в base64>:<шифртекст в base64>
 * Префикс позволяет хранилищу отличать зашифрованные значения от открытых
 * (надёжно при смене настроек и частичной миграции).
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

const KEY_NAME = '@bathroom_tracker_encryption_key';
const ENABLED_NAME = '@bathroom_tracker_encryption_enabled';

export const ENC_MARKER = 'enc:v1:';

// ---------------- Безопасное хранилище для ключа/флага ----------------

/** SecureStore недоступен на web — используем localStorage с явным префиксом. */
const secureBackend = {
  async getItem(name) {
    if (Platform.OS === 'web') {
      try {
        return window.localStorage.getItem(name);
      } catch (e) {
        return null;
      }
    }
    return SecureStore.getItemAsync(name);
  },
  async setItem(name, value) {
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
  async deleteItem(name) {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.removeItem(name);
      } catch (e) {
        /* ignore */
      }
    } else {
      await SecureStore.deleteItemAsync(name);
    }
  },
};

// ---------------- Ключ ----------------

/** Генерирует новый ключ (32 байта) и сохраняет его в безопасном хранилище. */
export async function generateEncryptionKey() {
  const bytes = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  await secureBackend.setItem(KEY_NAME, key);
  return key;
}

/** Возвращает ключ шифрования, создавая его при первом обращении. */
export async function getEncryptionKey() {
  let key = await secureBackend.getItem(KEY_NAME);
  if (!key) {
    key = await generateEncryptionKey();
  }
  return key;
}

/** Удаляет ключ и настройку — после этого данные расшифровать нельзя. */
export async function resetEncryption() {
  await secureBackend.deleteItem(KEY_NAME);
  await secureBackend.deleteItem(ENABLED_NAME);
}

// ---------------- Шифрование / расшифровка ----------------

/** AES-256-CBC со случайным IV. Возвращает строку вида enc:v1:<iv>:<ct>. */
export async function encrypt(data, key) {
  const k = key || (await getEncryptionKey());
  const ivBytes = await Crypto.getRandomBytesAsync(16);
  const iv = CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.create(ivBytes));
  const keyWA = CryptoJS.enc.Hex.parse(k);
  const ct = CryptoJS.AES.encrypt(data, keyWA, { iv: CryptoJS.enc.Base64.parse(iv) }).toString();
  return `${ENC_MARKER}${iv}:${ct}`;
}

/** Расшифровывает строку вида enc:v1:<iv>:<ct>. Бросает ошибку при неверном ключе. */
export async function decrypt(payload, key) {
  const k = key || (await getEncryptionKey());
  if (typeof payload !== 'string' || !payload.startsWith(ENC_MARKER)) {
    throw new Error('Неверный формат зашифрованных данных');
  }
  const body = payload.slice(ENC_MARKER.length);
  const sep = body.indexOf(':');
  if (sep < 0) throw new Error('Повреждённый зашифрованный блок');
  const iv = body.slice(0, sep);
  const ct = body.slice(sep + 1);
  const keyWA = CryptoJS.enc.Hex.parse(k);
  const decrypted = CryptoJS.AES.decrypt(ct, keyWA, {
    iv: CryptoJS.enc.Base64.parse(iv),
  }).toString(CryptoJS.enc.Utf8);
  if (!decrypted) {
    throw new Error('Не удалось расшифровать данные (неверный ключ или повреждённые данные)');
  }
  return decrypted;
}

// ---------------- Включение / статус ----------------

export async function isEncryptionEnabled() {
  try {
    const enabled = await secureBackend.getItem(ENABLED_NAME);
    return enabled === 'true';
  } catch (e) {
    return false;
  }
}

export async function setEncryptionEnabled(enabled) {
  try {
    await secureBackend.setItem(ENABLED_NAME, enabled ? 'true' : 'false');
    return true;
  } catch (e) {
    return false;
  }
}