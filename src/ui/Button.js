import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { palette, primaryButtonText, primaryButtonDisabled, radius, type } from '../theme';
import Icon from './Icon';

/**
 * Основная кнопка. `variant`: 'primary' | 'secondary' | 'ghost' | 'danger'.
 * `icon`: имя иконки (src/ui/Icon) для иллюстрации.
 */
export default function Button({
  variant = 'primary',
  title,
  icon,
  loading = false,
  disabled = false,
  onPress,
  style,
  textStyle,
  ...rest
}) {

  const bg =
    variant === 'secondary'
      ? palette.surfaceAlt
      : variant === 'ghost'
        ? 'transparent'
        : variant === 'danger'
          ? palette.danger
          : palette.accent;

  const fg =
    variant === 'secondary'
      ? palette.textPrimary
      : variant === 'ghost'
        ? palette.accent
        : palette.textOnAccent;

  const isDisabled = disabled || loading;

  return (
    <View
      style={[
        isDisabled && primaryButtonDisabled,
        styles.wrap,
        style,
      ]}
    >
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: bg }, variant !== 'ghost' && variant !== 'secondary' && styles.shadow]}
        activeOpacity={0.85}
        disabled={isDisabled}
        onPress={onPress}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {Icon && icon && <Icon name={icon} size={19} color={fg} strokeWidth="regular" />}
            <Text style={[styles.text, primaryButtonText, { color: fg }, textStyle, icon && { marginLeft: 8 }]}>
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.md },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  shadow: {
    shadowColor: palette.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  text: {
    fontSize: type.body,
    fontWeight: type.semibold,
    letterSpacing: 0.2,
  },
});
