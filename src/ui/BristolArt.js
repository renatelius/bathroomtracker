import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useThemeColors, type, radius } from '../theme';

/**
 * Метаданные Бристольской шкалы для использования в UI
 */
export const BRISTOL_META = [
  { id: 1, label: 'Комочки', short: 'Комочки', normal: false },
  { id: 2, label: 'Комковатая', short: 'Комковатая', normal: false },
  { id: 3, label: 'С трещинами', short: 'С трещинами', normal: false },
  { id: 4, label: 'Гладкая', short: 'Гладкая', normal: true },
  { id: 5, label: 'Мягкая', short: 'Мягкая', normal: false },
  { id: 6, label: 'Кашица', short: 'Кашица', normal: false },
  { id: 7, label: 'Водянистая', short: 'Водянистая', normal: false },
];

/**
 * Крупный SVG-глиф Бристольской шкалы с градиентным фоном-бейджем
 */
export function BristolGlyphLarge({ id, color, size = 80 }) {
  const palette = useThemeColors();
  const isNormal = id === 4;
  const glyphColor = isNormal ? palette.success : color || palette.accent;
  const gradientColors = palette.gradient || [palette.accentSoft, palette.accentSoft];
  const backgroundGradient = isNormal ? [palette.successSoft, palette.successSoft] : gradientColors;

  const viewBox = '0 0 64 64';
  const props = { 
    stroke: glyphColor, 
    strokeWidth: 2.5, 
    fill: 'none', 
    strokeLinecap: 'round', 
    strokeLinejoin: 'round' 
  };

  let glyphPath;
  switch (id) {
    case 1:
      glyphPath = (
        <>
          <Circle cx="18" cy="32" r="6" fill={glyphColor} opacity="0.9" />
          <Circle cx="32" cy="20" r="5" fill={glyphColor} opacity="0.8" />
          <Circle cx="46" cy="34" r="7" fill={glyphColor} opacity="0.95" />
        </>
      );
      break;
    case 2:
      glyphPath = (
        <Path 
          d="M12 34c8-12 18 6 28-6 6-6 10-3 8 3-3 8-12 10-20 10-7 0-12-4-16-7z" 
          {...props} 
        />
      );
      break;
    case 3:
      glyphPath = (
        <>
          <Path 
            d="M14 36c6-10 24-10 30 0 3 5-2 9-10 9s-16-3-20-9z" 
            {...props} 
          />
          <Line x1="28" y1="20" x2="28" y2="28" {...props} />
          <Line x1="36" y1="18" x2="36" y2="28" {...props} />
        </>
      );
      break;
    case 4:
      glyphPath = (
        <Path 
          d="M10 30c0-12 8-16 16-10 10 8 18-6 24 3 3 4 0 10-6 10" 
          {...props} 
        />
      );
      break;
    case 5:
      glyphPath = (
        <>
          <Path 
            d="M10 34c0-10 7-14 14-8 7 6-2 16-12 15-2 0-3-3-2-7z" 
            {...props} 
          />
          <Path 
            d="M38 26c0-7 6-10 12-7 6 3 4 14-3 16-4 1-8-3-9-9z" 
            {...props} 
          />
        </>
      );
      break;
    case 6:
      glyphPath = (
        <>
          <Path d="M10 28c0-6 6-8 10-4 3 3-2 8-6 8s-4-2-4-4z" {...props} />
          <Path d="M28 22c0-6 5-8 9-5 4 3 0 9-4 9s-5-2-5-4z" {...props} />
          <Path d="M18 42c0-5 5-7 8-4 3 3-2 6-5 6s-3-1-3-2z" {...props} />
          <Path d="M40 36c0-5 5-6 8-3 3 2 0 6-3 6s-5-2-5-3z" {...props} />
        </>
      );
      break;
    default:
      glyphPath = (
        <>
          <Path d="M12 38c8 0 8-8 16-8s8 8 16 8 8-8 10-8" {...props} />
          <Path 
            d="M12 44c8 0 8-8 16-8s8 8 16 8 8-8 10-8" 
            strokeDasharray="4 4" 
            opacity="0.7" 
            {...props} 
          />
        </>
      );
  }

  return (
    <Svg width={size} height={size} viewBox={viewBox}>
      <Defs>
        <LinearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={backgroundGradient[0]} />
          <Stop offset="100%" stopColor={backgroundGradient[1]} />
        </LinearGradient>
      </Defs>
      <Circle 
        cx="32" cy="32" r="28" 
        fill={`url(#grad-${id})`}
        opacity="0.15"
      />
      {glyphPath}
    </Svg>
  );
}

/**
 * Теплокарта Бристольской шкалы: 7 типов × 7 дней недели
 */
export function BristolHeatmap({ matrix, palette }) {
  const theme = useThemeColors();
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const cellPalette = palette || theme;

  // Нормализация значений для opacity (0.12 - 1.0)
  const maxValue = Math.max(...matrix.flat(), 1);
  const getOpacity = (value) => {
    if (value === 0) return 0.05;
    return 0.12 + (value / maxValue) * 0.88;
  };

  return (
    <View style={styles.heatmapContainer}>
      {/* Заголовки дней недели */}
      <View style={styles.headerRow}>
        <View style={styles.typeLabel} />
        {days.map((day) => (
          <Text key={day} style={[styles.dayLabel, { color: cellPalette.textSecondary }]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Матрица данных */}
      {matrix.map((row, typeIndex) => (
        <View key={typeIndex} style={styles.row}>
          <Text style={[styles.typeLabel, { color: cellPalette.textSecondary }]}>
            Тип {typeIndex + 1}
          </Text>
          {row.map((count, dayIndex) => (
            <View
              key={dayIndex}
              style={[
                styles.cell,
                {
                  backgroundColor: cellPalette.accent,
                  opacity: getOpacity(count),
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  heatmapContainer: {
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeLabel: {
    width: 50,
    fontSize: type.caption,
    fontWeight: '600',
  },
  dayLabel: {
    flex: 1,
    fontSize: type.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.sm,
    minHeight: 32,
  },
});
