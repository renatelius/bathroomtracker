import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { palette, radius, type, space } from '../theme';

/**
 * Выбираемая чип-кнопка (для выбора минут, диеты и т.п.).
 * `active`: выделено ли; `tone`: 'accent' | 'warning' | 'danger' для активного.
 */
export default function Chip({ label, active = false, tone = 'accent', onPress, style }) {
  const activeBg =
    tone === 'danger' ? palette.danger : tone === 'warning' ? palette.warning : palette.accent;
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active ? { backgroundColor: activeBg } : styles.inactive,
        style,
      ]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text style={[styles.text, active ? styles.activeText : styles.inactiveText]}>{label}</Text>
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
  inactive: { backgroundColor: palette.surfaceAlt },
  text: { fontSize: type.body, fontWeight: type.medium },
  activeText: { color: palette.textOnAccent, fontWeight: type.semibold },
  inactiveText: { color: palette.textPrimary },
});
