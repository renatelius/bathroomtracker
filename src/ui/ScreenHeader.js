import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, type, space } from '../theme';
import Icon from './Icon';

/**
 * Заголовок экрана с возможным подзаголовком и темой-контекстом.
 * `icon`: имя иконки слева.
 */
export default function ScreenHeader({ title, subtitle, icon, iconColor = palette.accent }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: palette.accentSoft }]}>
            <Icon name={icon} size={20} color={iconColor} strokeWidth="regular" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
    color: palette.textPrimary,
  },
  subtitle: {
    fontSize: type.label,
    color: palette.textSecondary,
    marginTop: 2,
  },
});
