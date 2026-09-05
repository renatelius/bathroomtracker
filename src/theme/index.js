/**
 * Дизайн-система BathroomTracker — premium wellness.
 * Apple Health (спокойный, воздух) + Material 3 Expressive (щедрые радиусы, софт-тени).
 * Первичный синий #2563EB + циан #38BDF8. SF Pro/Inter, мягкие градиенты, glass-акценты.
 * Единые токены для типа, спейсинга, радиусов, теней и семантики.
 */

import { paletteLight, paletteDark } from './palettes';
export { paletteLight, paletteDark, ThemeProvider, useThemeColors } from './theme-context';

// Основная палитра (по умолчанию — светлая; обратима хуком useThemeColors)
export const palette = paletteLight;

// Типографика: Apple Health-скейл (SF Pro / Inter). Крупный — плотнее, мелкий — воздушнее.
export const type = {
  hero: 34,        // Большой заголовок «Today's Activity»
  title: 24,       // Названия секций / карточек
  section: 17,     // Подзаголовки
  body: 16,        // Основной текст
  label: 13,       // Подписи
  caption: 12,     // Вспомогательный текст

  heavy: '800',
  semibold: '600',
  medium: '500',
  regular: '400',
  overline: '700',
  letterSpacingBody: 0.1,
  lineHeight: 1.4,
};

// Пространство (4px-сетка) — щедрые премиальные отступы
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
  xxxxl: 48,
};

// Радиусы M3 Expressive: карточки 24, крупные карточки 32, кнопки 14, пилюли — максимум.
export const radius = {
  sm: 14,
  md: 20,
  lg: 24,
  xl: 32,
  pill: 999,
};

// Тени: мягкие, воздушные (Apple Health) — глубина через лёгкую тень и blur.
export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sheet: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  accent: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
};

// Готовые комбинированные стили карточек/кнопок (переиспользуются в экранах)
export const card = {
  backgroundColor: palette.surface,
  borderRadius: radius.lg,
  padding: space.xl,
  marginBottom: space.lg,
  ...shadow.card,
};

// Основная кнопка — премиальная, с мягкой синей тенью
export const primaryButton = {
  backgroundColor: palette.accent,
  borderRadius: radius.md,
  paddingVertical: 16,
  paddingHorizontal: space.xl,
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
