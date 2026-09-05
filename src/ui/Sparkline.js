import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';
import { useThemeColors } from '../theme';

/**
 * Спарклайн тренда: линия значений с градиентной заливкой под ней,
 * опциональная точка последнего значения. Ширина адаптивная (onLayout).
 */
export default function Sparkline({
  data,
  height = 72,
  stroke,
  strokeWidth = 2.5,
  fillSoft = 0.28,
  dot = true,
}) {
  const palette = useThemeColors();
  const color = stroke || palette.accent;
  const [width, setWidth] = useState(300);
  const gradId = `spark-${(color || 'accent').replace('#', '')}`;

  if (!data || data.length === 0) return null;

  let min = Math.min(...data);
  let max = Math.max(...data);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min || 1;
  const padX = 3;
  const padTop = 8;
  const padBottom = 6;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const pts = data.map((v, i) => {
    const x = padX + (data.length === 1 ? 0.5 : i / (data.length - 1)) * innerW;
    const y = padTop + innerH - ((v - min) / span) * innerH;
    return [x, y];
  });
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${height} L${pts[0][0].toFixed(1)} ${height} Z`;
  const last = pts[pts.length - 1];

  return (
    <View
      style={{ width: '100%' }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setWidth(w);
      }}
    >
      <Svg width={width} height={height} style={styles.svg}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={fillSoft} />
            <Stop offset="1" stopColor={color} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill={`url(#${gradId})`} />
        <Path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        {dot ? <Circle cx={last[0]} cy={last[1]} r={4.5} fill={palette.bg} stroke={color} strokeWidth={2.5} /> : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: { alignSelf: 'flex-start' },
});