import React, { useRef } from 'react';
import { Animated, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors, radius, type, space } from '../theme';

function usePressScale() {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
  };
  return { scale, onPressIn, onPressOut };
}

/**
 * Выбираемая чип-кнопка (для выбора минут, диеты и т.п.).
 * `active`: выделено ли; `tone`: 'accent' | 'warning' | 'danger' для активного.
 */
export default function Chip({ label, active = false, tone = 'accent', onPress, style }) {
  const palette = useThemeColors();
  const { scale, onPressIn, onPressOut } = usePressScale();
  const activeBg =
    tone === 'danger' ? palette.danger : tone === 'warning' ? palette.warning : palette.accent;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        style={[
          styles.chip,
          active ? { backgroundColor: activeBg } : { backgroundColor: palette.surfaceAlt },
        ]}
        activeOpacity={0.8}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="radio"
        accessibilityState={{ selected: active }}
        accessibilityLabel={active ? `${label}, выбрано` : label}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: radius.pill,
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  text: { fontSize: type.body, fontWeight: type.medium },
  activeWeight: { fontWeight: type.semibold },
});
