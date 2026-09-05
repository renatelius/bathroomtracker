import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useThemeColors, type, space } from '../theme';

/**
 * Кольцо прогресса в стиле Apple Health.
 * `size` — диаметр, `stroke` — толщина линии, `progress` — 0..1,
 * `children` — контент в центре (число/заголовок).
 */
export default function ProgressRing({
  size = 168,
  stroke = 12,
  progress = 0,
  color,
  trackColor,
  centerLabel,
  centerValue,
  centerHint,
}) {
  const palette = useThemeColors();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const ringColor = color || palette.accent;
  const track = trackColor || palette.accentSoft;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={styles.ring}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={[styles.value, { color: palette.textPrimary }]}>{centerValue}</Text>
          {centerLabel ? (
            <Text style={[styles.unit, { color: palette.textSecondary }]}>{centerLabel}</Text>
          ) : null}
        </View>
        {centerHint ? (
          <Text style={[styles.hint, { color: palette.textSecondary }]}>{centerHint}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: type.hero, fontWeight: type.heavy, lineHeight: type.hero + 6 },
  unit: { fontSize: type.label, fontWeight: type.medium, marginLeft: space.xs },
  hint: { fontSize: type.caption, fontWeight: type.medium, marginTop: space.xs },
});
