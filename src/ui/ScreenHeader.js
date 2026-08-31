import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors, type, space } from '../theme';
import Icon from './Icon';

/**
 * Заголовок экрана с возможным подзаголовком и темой-контекстом.
 * `icon`: имя иконки слева.
 */
export default function ScreenHeader({ title, subtitle, icon, iconColor }) {
  const palette = useThemeColors();
  const resolvedIconColor = iconColor || palette.accent;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: palette.accentSoft }]}>
            <Icon name={icon} size={20} color={resolvedIconColor} strokeWidth="regular" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{subtitle}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  title: {
    fontSize: type.title,
    fontWeight: type.heavy,
  },
  subtitle: {
    fontSize: type.label,
    marginTop: 2,
  },
});
