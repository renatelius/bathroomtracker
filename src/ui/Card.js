import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors, card, radius, space } from '../theme';

/**
 * Карточка-поверхность. `tone`: 'default' | 'accent' | 'info' | 'dangerSoft'.
 * - accent: акцентная заливка (для главного числа прогноза)
 * - info / dangerSoft: подложки для семантических состояний
 */
export default function Card({ tone = 'default', style, children, ...rest }) {
  const palette = useThemeColors();
  const fills = {
    default: palette.surface,
    accent: palette.accent,
    info: palette.infoSoft,
    warning: palette.warningSoft,
    danger: palette.dangerSoft,
  };
  const shadows = {
    default: true,
    accent: true,
    info: false,
    warning: false,
    danger: false,
  };

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: fills[tone] || fills.default },
        shadows[tone] && { shadowColor: palette.textPrimary },
        tone === 'accent' && { shadowColor: palette.accent },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    ...card,
  },
});
