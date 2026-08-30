/**
 * Генератор PNG-иконок приложения (чистый Node, без canvas/imagemagick).
 * Рисует акцентную плашку со скруглёнными углами и белым знаком «прогноза»
 * (круг + линия-ритм) методами SDF (поля расстояний) по пикселям.
 *
 * Запуск: node scripts/gen-icons.mjs
 * Выход: assets/icon.png, adaptive-icon.png, splash-icon.png, favicon.png
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'assets');

// ---------- минимальный PNG-энкодер (RGBA8) ----------
function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePNG(width, height, pixelFn) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      const o = rowStart + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- SDF-помощники ----------
// закруглённый прямоугольник SDF
function sdRoundRect(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - (hw - r);
  const qy = Math.abs(y - cy) - (hh - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}
// круг SDF
function sdCircle(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) - r;
}
// отрезок SDF (для линии-ритма)
function sdSegment(x, y, x0, y0, x1, y1) {
  const px = x - x0, py = y - y0;
  const dx = x1 - x0, dy = y1 - y0;
  const l2 = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / l2));
  return Math.hypot(px - dx * t, py - dy * t);
}

// ---------- цвет ----------
const ACCENT = [0x2f, 0x7d, 0x63]; // #2F7D63
const WHITE = [0xff, 0xff, 0xff];
const TRANSPARENT = [0, 0, 0, 0];

const alpha = (a) => Math.max(0, Math.min(1, a));

/**
 * Отрисовка иконки. `size` — сторона, `isAdaptive` — с отступами (mac-adaptive),
 * `isSplash` — только плашка без знака (для splash можно с элементом).
 */
function render(size, { margin = 0, centered = true, showBadge = true } = {}) {
  const c = size / 2;
  const pad = size * 0.06 * (centered ? 1 : 1);
  const half = size / 2 - pad;
  const rad = size * 0.2;

  // координаты знака прогноза (отношение к size)
  const s = size;
  const ringR = s * 0.20;
  const ringC = { x: c - s * 0.02, y: c - s * 0.05 };
  // волна-линии (3 сегмента/дуги — упростим прямые отрезки с точками)
  const waveY = c + s * 0.16;
  const wave = [
    [c - s * 0.24, waveY - s * 0.06, c - s * 0.12, waveY + s * 0.06],
    [c - s * 0.12, waveY + s * 0.06, c, waveY - s * 0.06],
    [c, waveY - s * 0.06, c + s * 0.12, waveY + s * 0.06],
    [c + s * 0.12, waveY + s * 0.06, c + s * 0.24, waveY - s * 0.06],
  ];
  const lw = s * 0.028;

  return makePNG(size, size, (x, y) => {
    // фоновая плашка
    const dPlate = sdRoundRect(x + 0.5, y + 0.5, c, c, half, half, rad);
    const plateA = alpha(1 - dPlate);

    // белый знак
    let aSign = 0;
    if (showBadge) {
      const dRing = sdCircle(x + 0.5, y + 0.5, ringC.x, ringC.y, ringR);
      aSign = alpha(1 - dRing * (1 / 1.5));
      for (const [x0, y0, x1, y1] of wave) {
        const dSeg = sdSegment(x + 0.5, y + 0.5, x0, y0, x1, y1) - lw / 2;
        aSign = Math.max(aSign, alpha(1 - dSeg * (1 / 1.5)));
      }
    }

    // композиция: плашка (акцент), поверх белый знак
    const plateCol = ACCENT;
    const r = plateCol[0], g = plateCol[1], b = plateCol[2];
    const a = plateA;
    // поверх
    const rW = WHITE[0], gW = WHITE[1], bW = WHITE[2];
    const mix = (cr, cw, t) => Math.round(cr * (1 - t) + cw * t);
    const fr = mix(r, rW, aSign);
    const fg = mix(g, gW, aSign);
    const fb = mix(b, bW, aSign);
    return [fr, fg, fb, Math.round(a * 255)];
  });
}

// ---------- генерация всех размеров ----------
function write(name, buf) {
  const p = join(ASSETS, name);
  writeFileSync(p, buf);
  console.log(`wrote ${p} (${buf.length} bytes)`);
}

mkdirSync(ASSETS, { recursive: true });

// Стандартная иконка и adaptive-foreground
write('icon.png', render(1024, { centered: true, showBadge: true }));
// adaptive: foreground с внутренним отступом (безопасная зона)
write('adaptive-icon.png', render(1024, { centered: true, showBadge: true, margin: 1 }));
// splash: крупный знак на заливке
write('splash-icon.png', render(512, { centered: true, showBadge: true }));
// favicon: маленькая
write('favicon.png', render(256, { centered: true, showBadge: false, margin: 1 }));

console.log('icons generated');
