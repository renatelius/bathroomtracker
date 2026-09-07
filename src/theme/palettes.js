/**
 * Палитры светлой и тёмной тем — premium wellness.
 * Направление: Apple Health + Material 3 Expressive.
 * Первичный — синий #2563EB (trust/calm), вторичный — циан #38BDF8 (highlight),
 * теал-акцент для ЖКТ-семантики (природный баланс). Не клинический.
 */

export const paletteLight = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2F7',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textTertiary: '#94A3B8',
  textOnAccent: '#FFFFFF',

  accent: '#2563EB',
  accentSoft: '#E7EEFD',
  accentDark: '#1D4ED8',
  secondary: '#38BDF8',
  secondarySoft: '#E3F5FD',
  teal: '#0D9488',
  tealSoft: '#E0F5F2',

  info: '#2563EB',
  infoSoft: '#E7EEFD',
  success: '#22C55E',
  successSoft: '#DCFCE7',
  successText: '#166534',
  warning: '#F59E0B',
  warningSoft: '#FEF3E2',
  warningText: '#451A03',
  warningSoftText: '#92400E',
  danger: '#DC2626',
  dangerSoft: '#FDE8E9',

  border: '#E2E8F0',
  divider: '#EEF2F7',

  forecastLow: '#94A3B8',
  forecastMid: '#2563EB',
  forecastHigh: '#C9D6E6',

  gradient: ['#2563EB', '#38BDF8'],
  gradientSoft: ['#E7EEFD', '#E3F5FD'],
  gradientTeal: ['#0D9488', '#38BDF8'],

  shadow: '#0F172A',
  overlay: 'rgba(15,23,42,0.42)',
};

export const paletteDark = {
  bg: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#273449',

  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textTertiary: '#64748B',
  textOnAccent: '#FFFFFF',

  accent: '#3B82F6',
  accentSoft: '#1E3A8A',
  accentDark: '#60A5FA',
  secondary: '#38BDF8',
  secondarySoft: '#0C4A6E',
  teal: '#2DD4BF',
  tealSoft: '#134E4A',

  info: '#60A5FA',
  infoSoft: '#1E3A8A',
  success: '#22C55E',
  successSoft: '#14532D',
  successText: '#4ADE80',
  warning: '#F59E0B',
  warningSoft: '#451A03',
  warningText: '#451A03',
  warningSoftText: '#FCD34D',
  danger: '#F87171',
  dangerSoft: '#7F1D1D',

  border: '#334155',
  divider: '#273449',

  forecastLow: '#64748B',
  forecastMid: '#60A5FA',
  forecastHigh: '#1E293B',

  gradient: ['#2563EB', '#38BDF8'],
  gradientSoft: ['#1E3A8A', '#0C4A6E'],
  gradientTeal: ['#0D9488', '#38BDF8'],

  shadow: '#000000',
  overlay: 'rgba(2,6,23,0.55)',
};

/**
 * «Ауры» — персональные темы оформления (Вайб и Эстетика).
 * Каждая аура — полный слепок семантики paletteLight, чтобы useThemeColors()
 * перекрашивал всё приложение целиком. Ключ `isDark` подсказывает интерфейсу,
 * тёмная ли это палитра (для статус-бара и контента на акцентах).
 */

// 🌸 Пастельный дзен — мягкий, тёплый, женственный. База Apple Health, но «пудровая».
export const auraPastel = {
  bg: '#FDF6F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F7EEE6',

  textPrimary: '#403A4E',
  textSecondary: '#6C6680',
  textMuted: '#9A92AC',
  textTertiary: '#BFB6CC',
  textOnAccent: '#FFFFFF',

  accent: '#8EA5FF',
  accentSoft: '#EFEFFF',
  accentDark: '#7B8FEB',
  secondary: '#FFB7B2',
  secondarySoft: '#FFF0EE',
  teal: '#7FC8B4',
  tealSoft: '#E7F6F1',

  info: '#8EA5FF',
  infoSoft: '#EFEFFF',
  success: '#A3CF8E',
  successSoft: '#EEF7E8',
  successText: '#3F6A33',
  warning: '#F2B56B',
  warningSoft: '#FDF0E0',
  warningText: '#5A3A12',
  warningSoftText: '#9C6B2E',
  danger: '#E58B9B',
  dangerSoft: '#FBE9EE',

  border: '#F1E8DE',
  divider: '#F5EDE4',

  forecastLow: '#DCD3E6',
  forecastMid: '#8EA5FF',
  forecastHigh: '#F3EAF0',

  gradient: ['#8EA5FF', '#FFB7B2'],
  gradientSoft: ['#EFEFFF', '#FFF0EE'],
  gradientTeal: ['#7FC8B4', '#C7F0E3'],

  shadow: '#6E5A8A',
  overlay: 'rgba(64,58,78,0.35)',
  isDark: false,
};

// 🌆 Неоновый киберпанк — тёмный, сочные неон-акценты (циан/розовый/лайм).
export const auraCyberpunk = {
  bg: '#0A0A14',
  surface: '#131320',
  surfaceAlt: '#1D1D2E',

  textPrimary: '#F2F2FF',
  textSecondary: '#BBBBDA',
  textMuted: '#7C7CA0',
  textTertiary: '#5A5A78',
  textOnAccent: '#070711',

  accent: '#00F0FF',
  accentSoft: '#0E2A33',
  accentDark: '#00C8D6',
  secondary: '#FF2E88',
  secondarySoft: '#3A1230',
  teal: '#2EFFB1',
  tealSoft: '#0E2A23',

  info: '#00F0FF',
  infoSoft: '#0E2A33',
  success: '#00FF9D',
  successSoft: '#0E2A23',
  successText: '#4DFFC0',
  warning: '#FFCC00',
  warningSoft: '#332A0E',
  warningText: '#332A0E',
  warningSoftText: '#FFDD55',
  danger: '#FF4D6D',
  dangerSoft: '#3A0E1A',

  border: '#26263A',
  divider: '#1D1D2E',

  forecastLow: '#4A4A66',
  forecastMid: '#00F0FF',
  forecastHigh: '#1D1D30',

  gradient: ['#00F0FF', '#FF2E88'],
  gradientSoft: ['#0E2A33', '#3A1230'],
  gradientTeal: ['#2EFFB1', '#00F0FF'],

  shadow: '#00F0FF',
  overlay: 'rgba(0,0,0,0.6)',
  isDark: true,
};

// 🌌 Глубокий космос — тёмная тема с фиолетово-нефритовыми акцентами.
export const auraDeepSpace = {
  bg: '#12101C',
  surface: '#1B1828',
  surfaceAlt: '#262233',

  textPrimary: '#F2EFFA',
  textSecondary: '#C6BFE0',
  textMuted: '#8B83A8',
  textTertiary: '#5E5778',
  textOnAccent: '#14101E',

  accent: '#BB86FC',
  accentSoft: '#2A2040',
  accentDark: '#D0A9FF',
  secondary: '#03DAC6',
  secondarySoft: '#0E2A28',
  teal: '#03DAC6',
  tealSoft: '#0E2A28',

  info: '#BB86FC',
  infoSoft: '#2A2040',
  success: '#7CF29B',
  successSoft: '#14301C',
  successText: '#A9FFC0',
  warning: '#FFC46B',
  warningSoft: '#33260F',
  warningText: '#33260F',
  warningSoftText: '#FFD699',
  danger: '#FF6E77',
  dangerSoft: '#3A161A',

  border: '#302A42',
  divider: '#262233',

  forecastLow: '#4A4460',
  forecastMid: '#BB86FC',
  forecastHigh: '#2A2440',

  gradient: ['#BB86FC', '#03DAC6'],
  gradientSoft: ['#2A2040', '#0E2A28'],
  gradientTeal: ['#03DAC6', '#BB86FC'],

  shadow: '#BB86FC',
  overlay: 'rgba(0,0,0,0.6)',
  isDark: true,
};

// Индекс «аур» для механизма переключения.
export const auraPalettes = {
  pastel: auraPastel,
  cyberpunk: auraCyberpunk,
  deepspace: auraDeepSpace,
};
