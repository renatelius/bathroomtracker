import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors, card, radius, space } from '../theme';

/**
 * Карточка-поверхность. `tone`: 'default' | 'accent' | 'gradient' | 'info' | 'teal'.
 * - gradient: премиальный градиент primary->secondary (для hero/CTA)
 * - teal: теал-акцент (ЖКТ-семантика, природный)
 * - info: подложка для семантических состояний
 * Мягкие тени, большие радиусы (крупные карточки 24px, hero 32px).
 */
export default function Card({ tone = 'default', radius: r, style, children, ...rest }) {
  const palette = useThemeColors();
  const radii = { default: radius.lg, gradient: radius.xl, teal: radius.xl };
  const fill = radii[r] || radii[radius] || radius.lg;
  const isGradient = tone === 'gradient' || tone === 'teal';

  const gradientColors =
    tone === 'teal'
      ? palette.gradientTeal
      : tone === 'gradient'
        ? palette.gradient
        : null;

  const under = (
    <View
      style={[
        styles.base,
        !isGradient && { backgroundColor: tone === 'accent' ? palette.accent : getFill(tone, palette) },
        !isGradient && tone === 'accent' && { shadowColor: palette.accent },
        !isGradient && tone !== 'accent' && { shadowColor: palette.textPrimary },
        { borderRadius: fill },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );

  if (isGradient && gradientColors) {
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          { borderRadius: fill, shadowColor: palette.accent },
          style,
        ]}
        {...rest}
      >
        {children}
      </LinearGradient>
    );
  }
  return under;
}

function getFill(tone, palette) {
  switch (tone) {
    case 'info': return palette.infoSoft;
    case 'warning': return palette.warningSoft;
    case 'danger': return palette.dangerSoft;
    case 'tealSoft': return palette.tealSoft;
    default: return palette.surface;
  }
}

const styles = StyleSheet.create({
  base: {
    ...card,
    padding: space.xl,
  },
  gradient: {
    ...card,
    padding: space.xl,
  },
});
