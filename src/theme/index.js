/**
 * Дизайн-система BathroomTracker.
 * Спокойная палитра, медицинский нейтральный регистр (тема деликатная).
 * Единые токены для типа, спейсинга, радиусов, теней и семантики.
 */

import { paletteLight, paletteDark } from './palettes';
export { paletteLight, paletteDark, ThemeProvider, useThemeColors } from './theme-context';

// Основная палитра (по умолчанию — светлая; обратима хуком useThemeColors)
export const palette = paletteLight;

// Типографика: единый размерный ряд (масштаб удобен для чтения с руки)
export const type = {
  hero: 30,
  title: 22,
  section: 17,
  body: 15,
  label: 13,
  caption: 11,

  heavy: '800',
  semibold: '600',
  medium: '500',
  regular: '400',
  lineHeight: 1.35,
};

// Пространство
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

// Радиусы
export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
};

// Тени (iOS + Android)
export const shadow = {
  card: {
    shadowColor: '#1E2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  accent: {
    shadowColor: '#2F7D63',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
};

// Готовые комбинированные стили карточек/кнопок (переиспользуются в экранах)
export const card = {
  backgroundColor: palette.surface,
  borderRadius: radius.md,
  padding: space.lg,
  marginBottom: space.md,
  ...shadow.card,
};

// Основная кнопка
export const primaryButton = {
  backgroundColor: palette.accent,
  borderRadius: radius.md,
  paddingVertical: 15,
  paddingHorizontal: space.lg,
  alignItems: 'center',
  justifyContent: 'center',
  ...shadow.accent,
};

export const primaryButtonDisabled = {
  opacity: 0.55,
};

export const primaryButtonText = {
  color: palette.textOnAccent,
  fontSize: type.body,
  fontWeight: type.semibold,
};

export const screenContainer = {
  flex: 1,
  backgroundColor: palette.bg,
};

export const screenScroll = {
  padding: space.xl,
  paddingTop: 16,
};

