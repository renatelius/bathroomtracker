import React from 'react';
import { TextInput, Text, View, StyleSheet } from 'react-native';
import { palette, radius, type, space } from '../theme';

/**
 * Текстовое поле с подписью. `label` над полем, `error` под полем.
 */
export default function TextField({
  label,
  error,
  multiline = false,
  style,
  inputStyle,
  ...rest
}) {
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          multiline && styles.multiline,
          error ? { borderColor: palette.danger } : null,
          inputStyle,
        ]}
        placeholderTextColor={palette.textMuted}
        multiline={multiline}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  label: {
    fontSize: type.label,
    fontWeight: type.semibold,
    color: palette.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: palette.surface,
    fontSize: type.body,
    color: palette.textPrimary,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  error: {
    color: palette.danger,
    fontSize: type.caption,
    marginTop: 4,
  },
});
