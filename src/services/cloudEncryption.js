/**
 * Шифрование данных для облака (end-to-end).
 *
 * В отличие от локального шифрования (encryption.js), ключ производится
 * из пароля пользователя через PBKDF2 (100 000 итераций, SHA1) — поэтому
 * данные читаемы только тем, кто знает пароль, и даже сервер не видит их.
 *
 * Соль и IV случайные и ВСТРОЕНЫ в payload — бэкап можно расшифровать на
 * любом устройстве, зная только пароль (важно при восстановлении на новом
 * телефоне).
 *
 * Формат:  cloudv1:<saltHex>:<ivHex>:<ciphertext base64>
 */

import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

const MARKER = 'cloudv1:';
const PBKDF2_ITERATIONS = 100000;

async function randomHex(bytes) {
  const b = await Crypto.getRandomBytesAsync(bytes);
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

function deriveKey(password, saltHex) {
  return CryptoJS.PBKDF2(password, saltHex, {
    keySize: 256 / 32,
    iterations: PBKDF2_ITERATIONS,
  }).toString();
}

/**
 * Шифрует строку данных (обычно JSON) паролем пользователя.
 * @param {string} data
 * @param {string} password
 * @returns {Promise<string>} payload вида cloudv1:<salt>:<iv>:<base64>
 */
export async function encryptForCloud(data, password) {
  if (!password || typeof password !== 'string' || !password.length) {
    throw new Error('Пароль для шифрования не задан');
  }
  const salt = await randomHex(16);
  const iv = await randomHex(16);
  const keyHex = deriveKey(password, salt);
  const keyWA = CryptoJS.enc.Hex.parse(keyHex);

  const ct = CryptoJS.AES.encrypt(data, keyWA, {
    iv: CryptoJS.enc.Hex.parse(iv),
  }).toString();

  return `${MARKER}${salt}:${iv}:${ct}`;
}

/**
 * Расшифровывает payload, созданный encryptForCloud.
 * Бросает ошибку при неверном пароле или повреждённых данных.
 * @param {string} payload
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function decryptFromCloud(payload, password) {
  if (!payload || typeof payload !== 'string' || !payload.startsWith(MARKER)) {
    throw new Error('Неверный формат зашифрованных данных');
  }
  const body = payload.slice(MARKER.length);
  const parts = body.split(':');
  if (parts.length !== 3) {
    throw new Error('Повреждённый зашифрованный блок');
  }
  const [salt, iv, ct] = parts;
  const keyHex = deriveKey(password, salt);
  const keyWA = CryptoJS.enc.Hex.parse(keyHex);

  const bytes = CryptoJS.AES.decrypt(ct, keyWA, {
    iv: CryptoJS.enc.Hex.parse(iv),
  });
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  if (!decrypted) {
    throw new Error('Неверный пароль или повреждённые данные');
  }
  return decrypted;
}