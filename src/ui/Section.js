import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors, type, space } from '../theme';

/**
 * Заголовок секции контента с необязательным значением справа.
 */
export default function Section({ title, value, right, style }) {
  const palette = useThemeColors();
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.title, { color: palette.textPrimary }]}>{title}</Text>
      {value ? <Text style={[styles.value, { color: palette.accent }]}>{value}</Text> : null}
      {right ? <View style={{ marginLeft: 'auto' }}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm, marginBottom: space.sm },
  title: {
    fontSize: type.section,
    fontWeight: type.semibold,
  },
  value: {
    marginLeft: 'auto',
    fontSize: type.body,
    fontWeight: type.semibold,
  },
});
