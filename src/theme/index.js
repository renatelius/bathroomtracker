/**
 * Дизайн-система BathroomTracker.
 * Спокойный регистр «calm medical»: тёплая палитра (лён/мох/янтарь),
 * пропорциональный типографический скейл, воздух вместо линий.
 * Единые токены для типа, спейсинга, радиусов, теней и семантики.
 */

import { paletteLight, paletteDark } from './palettes';
export { paletteLight, paletteDark, ThemeProvider, useThemeColors } from './theme-context';

// Основная палитра (по умолчанию — светлая; обратима хуком useThemeColors)
export const palette = paletteLight;

// Типографика: пропорциональный ряд (Refactoring UI: крупный — плотнее,
// мелкий — воздушнее). Шрифт системный; для web/RN хорошо ложится Inter.
export const type = {
  hero: 34,
  title: 24,
  section: 17,
  body: 16,
  label: 13,
  caption: 12,

  heavy: '800',
  semibold: '600',
  medium: '500',
  regular: '400',
  overline: '600',
  letterSpacingBody: 0.1,
  lineHeight: 1.4,
};

// Пространство (4px-сетка)
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

// Радиусы: карточки 16, кнопки 12, шторка 20, пилюли — максимум.
export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  pill: 999,
};

// Тени (iOS + Android): мягкие, минимальные — глубина через цвет, не тень.
export const shadow = {
  card: {
    shadowColor: '#3A3B36',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sheet: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  accent: {
    shadowColor: '#1D5C46',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
};

// Готовые комбинированные стили карточек/кнопок (переиспользуются в экранах)
export const card = {
  backgroundColor: palette.surface,
  borderRadius: radius.md,
  padding: space.lg,
  marginBottom: space.lg,
  ...shadow.card,
};

// Основная кнопка
export const primaryButton = {
  backgroundColor: palette.accent,
  borderRadius: radius.sm,
  paddingVertical: 15,
  paddingHorizontal: space.lg,
  alignItems: 'center',
  justifyContent: 'center',
  ...shadow.accent,
};

export const primaryButtonDisabled = {
  opacity: 0.5,
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

export const heroPadding = { paddingVertical: space.xxl, paddingHorizontal: space.xl };