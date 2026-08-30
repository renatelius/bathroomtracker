import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, type, space } from '../theme';

/**
 * Заголовок секции контента с необязательным значением справа.
 */
export default function Section({ title, value, right, style }) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {right ? <View style={{ marginLeft: 'auto' }}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm, marginBottom: space.sm },
  title: {
    fontSize: type.section,
    fontWeight: type.semibold,
    color: palette.textPrimary,
  },
  value: {
    marginLeft: 'auto',
    fontSize: type.body,
    fontWeight: type.semibold,
    color: palette.accent,
  },
});
