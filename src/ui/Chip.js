import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useThemeColors, radius, type, space } from '../theme';

/**
 * Выбираемая чип-кнопка (для выбора минут, диеты и т.п.).
 * `active`: выделено ли; `tone`: 'accent' | 'warning' | 'danger' для активного.
 */
export default function Chip({ label, active = false, tone = 'accent', onPress, style }) {
  const palette = useThemeColors();
  const activeBg =
    tone === 'danger' ? palette.danger : tone === 'warning' ? palette.warning : palette.accent;
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active ? { backgroundColor: activeBg } : { backgroundColor: palette.surfaceAlt },
        style,
      ]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text
        style={[
          styles.text,
          active ? { color: palette.textOnAccent } : { color: palette.textPrimary },
          active && styles.activeWeight,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: type.body, fontWeight: type.medium },
  activeWeight: { fontWeight: type.semibold },
});
