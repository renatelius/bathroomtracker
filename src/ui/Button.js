import React, { useRef } from 'react';
import { Text, TouchableOpacity, Animated, StyleSheet, ActivityIndicator } from 'react-native';
import { useThemeColors, primaryButtonText, primaryButtonDisabled, radius, type } from '../theme';
import Icon from './Icon';

function usePressScale() {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
  };
  return { scale, onPressIn, onPressOut };
}

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
  const palette = useThemeColors();

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
  const { scale, onPressIn, onPressOut } = usePressScale();

  return (
    <Animated.View
      style={[
        isDisabled && primaryButtonDisabled,
        styles.wrap,
        style,
        { transform: [{ scale }] },
      ]}
    >
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: bg }, variant !== 'ghost' && variant !== 'secondary' && styles.shadow, { shadowColor: palette.accent }]}
        activeOpacity={0.85}
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
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
    </Animated.View>
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
