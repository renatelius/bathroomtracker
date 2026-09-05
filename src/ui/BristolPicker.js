import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { useThemeColors, type, space, radius } from '../theme';

/**
 * Бристольская шкала формы стула (1-7) — без клинических картинок,
 * абстрактные глифы + короткие подписи (не «медицинский» вид).
 */
export const BRISTOL_TYPES = [
  { id: 1, label: 'Комочки', desc: 'Отдельные твёрдые комочки' },
  { id: 2, label: 'Комковатая', desc: 'Колбаска из комочков' },
  { id: 3, label: 'С трещинами', desc: 'Колбаска с трещинами' },
  { id: 4, label: 'Гладкая', desc: 'Гладкая мягкая колбаска' },
  { id: 5, label: 'Мягкая', desc: 'Мягкие кусочки с чёткими краями' },
  { id: 6, label: 'Кашица', desc: 'Рыхлые кусочки' },
  { id: 7, label: 'Водянистая', desc: 'Жидкость, без оформления' },
];

export const COMFORT_LEVELS = [
  { id: 1, label: 'Легко' },
  { id: 2, label: 'Нормально' },
  { id: 3, label: 'Напряжённо' },
  { id: 4, label: 'Трудно' },
  { id: 5, label: 'Очень трудно' },
];

function BristolGlyph({ id, color }) {
  const stroke = color;
  const props = { stroke, strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (id) {
    case 1:
      return (
        <Svg width="100%" height="100%" viewBox="0 0 48 48">
          <Circle cx="13" cy="26" r="4.6" fill={color} />
          <Circle cx="25" cy="17" r="3.6" fill={color} />
          <Circle cx="33" cy="28" r="5.4" fill={color} />
        </Svg>
      );
    case 2:
      return (
        <Svg width="100%" height="100%" viewBox="0 0 48 48">
          <Path d="M10 27c6-9 14 4 22-4 4-4 8-2 6 2-2 6-10 8-16 8-5 0-9-3-12-6z" {...props} />
        </Svg>
      );
    case 3:
      return (
        <Svg width="100%" height="100%" viewBox="0 0 48 48">
          <Path d="M12 28c4-8 20-8 24 0 2 4-2 7-8 7s-12-2-16-7z" {...props} />
          <Line x1="22" y1="16" x2="22" y2="22" {...props} />
          <Line x1="27" y1="15" x2="27" y2="22" {...props} />
        </Svg>
      );
    case 4:
      return (
        <Svg width="100%" height="100%" viewBox="0 0 48 48">
          <Path d="M9 24c0-9 6-13 12-9 8 6 14-4 18 2 2 3 0 7-4 7" {...props} />
        </Svg>
      );
    case 5:
      return (
        <Svg width="100%" height="100%" viewBox="0 0 48 48">
          <Path d="M9 27c0-7 5-10 10-6 5 4-1 12-8 11-1 0-2-2-2-5z" {...props} />
          <Path d="M29 21c0-5 4-7 8-5 4 2 3 9-2 11-3 1-6-2-6-6z" {...props} />
        </Svg>
      );
    case 6:
      return (
        <Svg width="100%" height="100%" viewBox="0 0 48 48">
          <Path d="M8 22c0-4 4-6 7-3 2 2-1 5-4 5s-3-1-3-2z" {...props} />
          <Path d="M22 17c0-4 3-6 6-4 3 2 0 6-3 6s-3-1-3-2z" {...props} />
          <Path d="M14 32c0-3 3-5 5-3 2 2-1 4-3 4s-2-1-2-1z" {...props} />
          <Path d="M30 28c0-3 3-4 5-2 2 1 0 4-2 4s-3-1-3-2z" {...props} />
        </Svg>
      );
    default:
      return (
        <Svg width="100%" height="100%" viewBox="0 0 48 48">
          <Path d="M10 30c6 0 6-6 12-6s6 6 12 6 6-6 8-6" {...props} />
          <Path d="M10 34c6 0 6-6 12-6s6 6 12 6 6-6 8-6" strokeDasharray="3 3" opacity="0.6" {...props} />
        </Svg>
      );
  }
}

export function BristolScale({ value, onChange }) {
  const palette = useThemeColors();
  return (
    <View>
      <View style={styles.grid}>
        {BRISTOL_TYPES.map((t) => {
          const active = value === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => onChange(active ? null : t.id)}
              activeOpacity={0.8}
              style={[
                styles.cell,
                {
                  backgroundColor: active ? palette.accent : palette.surface,
                  borderColor: active ? palette.accent : palette.border,
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Тип ${t.id}: ${t.label}, ${t.desc}`}
            >
              <View style={[styles.glyph, { backgroundColor: active ? palette.accentSoft : palette.surfaceAlt }]}>
                <BristolGlyph id={t.id} color={active ? palette.accent : palette.textSecondary} />
              </View>
              <Text style={[styles.cellType, { color: active ? palette.textOnAccent : palette.textSecondary }]}>
                {t.id}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.cellLabel, { color: active ? palette.textOnAccent : palette.textPrimary }]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {value != null ? (
        <Text style={[styles.selectedDesc, { color: palette.textSecondary }]}>
          Тип {value} — {BRISTOL_TYPES.find((t) => t.id === value)?.desc}
        </Text>
      ) : null}
    </View>
  );
}

export function ComfortPicker({ value, onChange }) {
  const palette = useThemeColors();
  return (
    <View style={styles.comfortRow}>
      {COMFORT_LEVELS.map((c) => {
        const active = value === c.id;
        return (
          <TouchableOpacity
            key={c.id}
            onPress={() => onChange(active ? null : c.id)}
            activeOpacity={0.8}
            style={[
              styles.comfortChip,
              {
                backgroundColor: active ? palette.accent : palette.surface,
                borderColor: active ? palette.accent : palette.border,
              },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Комфорт: ${c.label}`}
          >
            <Text
              numberOfLines={1}
              style={[styles.comfortText, { color: active ? palette.textOnAccent : palette.textPrimary }]}
            >
              {c.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: '23%',
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: space.sm,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  glyph: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  cellType: { fontSize: 13, fontWeight: '700' },
  cellLabel: { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  selectedDesc: { fontSize: type.caption, marginTop: space.sm, textAlign: 'center' },
  comfortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  comfortChip: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comfortText: { fontSize: type.label, fontWeight: '600' },
});