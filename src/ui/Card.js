import React from 'react';
import { View, StyleSheet } from 'react-native';
import { palette, card, radius, space } from '../theme';

/**
 * Карточка-поверхность. `tone`: 'default' | 'accent' | 'info' | 'dangerSoft'.
 * - accent: акцентная заливка (для главного числа прогноза)
 * - info / dangerSoft: подложки для семантических состояний
 */
export default function Card({ tone = 'default', style, children, ...rest }) {
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
        shadows[tone] && styles.shadow,
        tone === 'accent' && styles.accentCard,
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
  shadow: {
    shadowColor: palette.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  accentCard: {
    shadowColor: palette.accent,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
});
