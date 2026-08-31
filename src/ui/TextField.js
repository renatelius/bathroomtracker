import React from 'react';
import { TextInput, Text, View, StyleSheet } from 'react-native';
import { useThemeColors, radius, type, space } from '../theme';

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
  const palette = useThemeColors();
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          { borderColor: error ? palette.danger : palette.border, backgroundColor: palette.surface, color: palette.textPrimary },
          multiline && styles.multiline,
          inputStyle,
        ]}
        placeholderTextColor={palette.textMuted}
        multiline={multiline}
        {...rest}
      />
      {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  label: {
    fontSize: type.label,
    fontWeight: type.semibold,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: type.body,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  error: {
    fontSize: type.caption,
    marginTop: 4,
  },
});
