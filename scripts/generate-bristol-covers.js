/**
 * generate-bristol-covers.js
 * Арт-ассеты обложки функции «Детальный экран Бристоля».
 * Владелец: агент "картинки". Не трогает код приложения — пишет только в assets/promo/.
 *
 * Бриф: docs/bristol-cover.md (координаты, палитра, слои).
 * Подход: чистый Canvas 2D (node-canvas), как scripts/make_icons2.js.
 *
 * Запуск:  node scripts/generate-bristol-covers.js
 * Требует: npm i canvas   (node-canvas). Если canvas недоступен, использовать
 *          любой Canvas-совместимый бэкенд (@napi-rs/canvas) — API идентичен.
 *
 * Выход:
 *   assets/promo/bristol-hero-1200x630.png   (og-image)
 *   assets/promo/bristol-card-1024.png       (квадратная карточка)
 *   assets/promo/bristol-badge-512.png       (мини-бейдж, squircle)
 *   assets/promo/bristol-badge-256.png       (favicon-размер)
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'promo');
fs.mkdirSync(OUT, { recursive: true });

// ---- Design tokens (см. docs/bristol-cover.md §0) ----
const T = {
  primary: '#2563EB',   // brand.primary — старт градиента
  accent:  '#38BDF8',   // brand.accentCyan — финиш градиента
  badge:   '#FFFFFF',   // brand.badge
  success: '#22C55E',   // state.success — акцент типа 4 «норма»
  onDark:  '#FFFFFF',   // text.onDark
  muted:   '#DBEAFE',   // text.onDarkMuted
  onBadge: '#1E293B',   // text.onBadge
};

// Линейный градиент 135° (top-left -> bottom-right) + центральный glow
function bgGradient(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, T.primary);
  g.addColorStop(1, T.accent);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rg = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.45);
  rg.addColorStop(0, 'rgba(255,255,255,0.10)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Белый badge с мягкой тенью; accent=true -> зелёное кольцо + glow (тип 4)
function drawBadge(ctx, cx, cy, d, accent = false) {
  const r = d / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(2,6,23,0.25)';
  ctx.shadowBlur = d * 0.20;
  ctx.shadowOffsetY = d * 0.07;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = T.badge;
  ctx.fill();
  ctx.restore();

  if (accent) {
    ctx.save();
    ctx.shadowColor = 'rgba(34,197,94,0.55)';
    ctx.shadowBlur = d * 0.22;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(3, d * 0.028);
    ctx.strokeStyle = T.success;
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(3, d * 0.028);
    ctx.strokeStyle = T.success;
    ctx.stroke();
  }
}

// Глифы типов 1..7 шкалы Бристоля, центр (cx,cy), масштаб = d (диаметр badge)
function glyph(ctx, type, cx, cy, d) {
  const s = d;
  const col = (type === 4) ? T.success : T.onBadge;
  ctx.save();
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 1) {                       // отдельные твёрдые комочки
    const rr = s * 0.075;
    [[-0.20, -0.14], [0.16, -0.16], [-0.05, 0.10], [0.22, 0.12]].forEach(([px, py]) => {
      ctx.beginPath(); ctx.arc(cx + px * s, cy + py * s, rr, 0, Math.PI * 2); ctx.fill();
    });
  } else if (type === 2) {                // комковатая колбаса
    const w = s * 0.56, h = s * 0.30;
    roundRectPath(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.arc(cx + i * s * 0.16, cy - h / 2, s * 0.075, 0, Math.PI, true); ctx.fill();
    }
  } else if (type === 3) {                // колбаса с трещинами
    const w = s * 0.58, h = s * 0.26;
    roundRectPath(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = T.badge; ctx.lineWidth = s * 0.03;
    [-0.12, 0.02, 0.16].forEach(fx => {
      ctx.beginPath();
      ctx.moveTo(cx + fx * s, cy - h * 0.35);
      ctx.lineTo(cx + fx * s, cy + h * 0.35);
      ctx.stroke();
    });
  } else if (type === 4) {                // НОРМА: гладкий изогнутый валик (S)
    ctx.lineWidth = s * 0.14;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.26, cy + s * 0.10);
    ctx.bezierCurveTo(cx - s * 0.10, cy - s * 0.20, cx + s * 0.10, cy + s * 0.20, cx + s * 0.26, cy - s * 0.10);
    ctx.stroke();
  } else if (type === 5) {                // мягкие капли с чёткими краями
    const rr = s * 0.11;
    [[-0.18, 0.02], [0.02, -0.06], [0.20, 0.06]].forEach(([px, py]) => {
      ctx.beginPath(); ctx.arc(cx + px * s, cy + py * s, rr, 0, Math.PI * 2); ctx.fill();
    });
  } else if (type === 6) {                // рыхлые кусочки, рваные края
    ctx.beginPath();
    const n = 11, baseR = s * 0.20;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rad = baseR * (i % 2 === 0 ? 1.0 : 0.72);
      const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  } else if (type === 7) {                // водянистая: волна + рябь
    const w = s * 0.56, top = cy + s * 0.02, amp = s * 0.05;
    ctx.beginPath(); ctx.moveTo(cx - w / 2, top);
    for (let x = 0; x <= w; x += w / 8) {
      const y = top + Math.sin((x / w) * Math.PI * 3) * amp;
      ctx.lineTo(cx - w / 2 + x, y);
    }
    ctx.lineTo(cx + w / 2, cy + s * 0.20);
    ctx.lineTo(cx - w / 2, cy + s * 0.20);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = s * 0.03;
    ctx.beginPath(); ctx.moveTo(cx - w * 0.35, cy - s * 0.14);
    for (let x = 0; x <= w * 0.7; x += w * 0.1) {
      const y = cy - s * 0.14 + Math.sin((x / (w * 0.7)) * Math.PI * 3) * amp * 0.6;
      ctx.lineTo(cx - w * 0.35 + x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Маленький номер типа в углу badge
function numberChip(ctx, cx, cy, d, n) {
  const r = d * 0.16;
  const px = cx + d * 0.34, py = cy + d * 0.34;
  ctx.save();
  ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fillStyle = T.badge;
  ctx.shadowColor = 'rgba(2,6,23,0.25)';
  ctx.shadowBlur = d * 0.05;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = T.onBadge;
  ctx.font = `700 ${Math.round(r * 1.2)}px Sans`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(n), px, py + r * 0.05);
}

function drawBadgeFull(ctx, type, cx, cy, d, withNumber = true) {
  drawBadge(ctx, cx, cy, d, type === 4);
  glyph(ctx, type, cx, cy, d);
  if (withNumber) numberChip(ctx, cx, cy, d, type);
}

function labelNorma(ctx, cx, topY, lw, lh, fontPx) {
  ctx.save();
  roundRectPath(ctx, cx - lw / 2, topY, lw, lh, lh / 2);
  ctx.fillStyle = 'rgba(15,23,42,0.30)';
  ctx.fill();
  ctx.fillStyle = T.onDark;
  ctx.font = `600 ${fontPx}px Sans`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('норма', cx, topY + lh / 2 + 1);
  ctx.restore();
}

function save(canvas, name) {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, canvas.toBuffer('image/png'));
  console.log(`wrote ${path.relative(path.join(__dirname, '..'), p)} (${fs.statSync(p).size} bytes)`);
}

// ============ (а) HERO 1200×630 (og-image) ============
function renderHero() {
  const W = 1200, H = 630;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  bgGradient(ctx, W, H);

  // орбита-дуга (hairline)
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(905, 325, 320, -Math.PI * 0.85, Math.PI * 0.85);
  ctx.stroke();
  ctx.restore();

  // 7 badges — тип 4 рисуется последним (поверх)
  [
    [1, 700, 210, 116], [2, 838, 190, 116], [3, 976, 210, 116],
    [5, 700, 440, 116], [6, 838, 460, 116], [7, 976, 440, 116],
    [4, 905, 330, 134],
  ].forEach(([t, cx, cy, d]) => drawBadgeFull(ctx, t, cx, cy, d));

  labelNorma(ctx, 905, 330 + 134 / 2 + 14, 120, 34, 20);

  // Текстовый блок — левая тёмная зона (контраст AA)
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = '700 60px Sans'; ctx.fillStyle = T.muted;
  ctx.fillText('BathroomTracker', 80, 285);
  ctx.font = '800 96px Sans'; ctx.fillStyle = T.onDark;
  ctx.fillText('Bristol', 80, 285 + 96);
  ctx.font = '500 28px Sans'; ctx.fillStyle = T.muted;
  ctx.fillText('Bristol Stool Scale · типы 1–7', 80, 285 + 96 + 50);
  ctx.font = '500 20px Sans';
  ctx.fillText('Детальный экран · норма = тип 4', 80, 285 + 96 + 50 + 34);

  save(canvas, 'bristol-hero-1200x630.png');
}

// ============ (б) CARD 1024×1024 ============
function renderCard() {
  const W = 1024, H = 1024;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  bgGradient(ctx, W, H);

  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = '700 56px Sans'; ctx.fillStyle = T.muted;
  ctx.fillText('BathroomTracker', 512, 180);
  ctx.font = '800 92px Sans'; ctx.fillStyle = T.onDark;
  ctx.fillText('Bristol', 512, 280);

  // Раскладка 3-1-3
  [
    [1, 300, 470, 150], [2, 512, 440, 150], [3, 724, 470, 150],
    [5, 300, 810, 150], [6, 512, 840, 150], [7, 724, 810, 150],
    [4, 512, 640, 176],
  ].forEach(([t, cx, cy, d]) => drawBadgeFull(ctx, t, cx, cy, d));

  labelNorma(ctx, 512, 640 + 176 / 2 + 16, 150, 42, 26);

  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = '500 30px Sans'; ctx.fillStyle = T.muted;
  ctx.fillText('Bristol Stool Scale · типы 1–7', 512, 965);

  save(canvas, 'bristol-card-1024.png');
}

// ============ (в) MINI BADGE (squircle, прозрачные углы) ============
function renderMini(size, name) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size * 0.22;
  roundRectPath(ctx, 0, 0, size, size, r);
  ctx.save(); ctx.clip();
  bgGradient(ctx, size, size);
  ctx.restore();
  const d = size * 0.62;
  drawBadge(ctx, size / 2, size / 2, d, true);
  glyph(ctx, 4, size / 2, size / 2, d);
  save(canvas, name);
}

function main() {
  renderHero();
  renderCard();
  renderMini(512, 'bristol-badge-512.png');
  renderMini(256, 'bristol-badge-256.png');
  console.log('Bristol covers: DONE ->', OUT);
}

main();
