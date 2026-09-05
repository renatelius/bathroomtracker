import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle, Rect, Path, Line } from 'react-native-svg';
import { useThemeColors, type, space, radius, shadow } from '../theme';

/**
 * Премиум-иллюстрация пустого состояния: градиент-бейдж (как иконка приложения)
 * с белым глифом + мягкое кольцо и полупрозрачные акценты.
 * Глифы: leaf | history | chart | search | drop | calendar.
 */
export function Illustration({ variant, palette, size }) {
  const W = 140;
  const H = 140;
  const [c0, c1] = palette.gradient;
  const glyph = '#FFFFFF';

  const glyphs = {
    leaf: (
      <>
        <Circle cx={61} cy={66} r={13} fill={glyph} />
        <Circle cx={79} cy={66} r={13} fill={glyph} />
        <Path d="M70 76 L70 90" stroke={glyph} strokeWidth={5} strokeLinecap="round" />
      </>
    ),
    history: (
      <>
        <Path d="M54 62 h30" stroke={glyph} strokeWidth={5} strokeLinecap="round" opacity={0.55} />
        <Path d="M54 71 h22" stroke={glyph} strokeWidth={5} strokeLinecap="round" />
        <Path d="M54 80 h28" stroke={glyph} strokeWidth={5} strokeLinecap="round" opacity={0.7} />
      </>
    ),
    chart: (
      <>
        <Rect x={52} y={72} width={12} height={20} rx={3.5} fill={glyph} />
        <Rect x={64} y={58} width={12} height={34} rx={3.5} fill={glyph} opacity={0.75} />
        <Rect x={76} y={64} width={12} height={28} rx={3.5} fill={glyph} opacity={0.9} />
      </>
    ),
    search: (
      <>
        <Circle cx={66} cy={66} r={14} stroke={glyph} strokeWidth={5} fill="none" />
        <Line x1={77} y1={77} x2={85} y2={85} stroke={glyph} strokeWidth={6} strokeLinecap="round" />
      </>
    ),
    drop: (
      <Path
        d="M70 48 C70 48 52 68 52 78 a18 18 0 0 0 36 0 C88 68 70 48 70 48 Z"
        fill={glyph}
      />
    ),
    calendar: (
      <>
        <Rect x={52} y={60} width={36} height={30} rx={7} stroke={glyph} strokeWidth={5} fill="none" />
        <Line x1={66} y1={54} x2={66} y2={66} stroke={glyph} strokeWidth={5} strokeLinecap="round" />
        <Line x1={56} y1={74} x2={84} y2={74} stroke={glyph} strokeWidth={5} strokeLinecap="round" />
      </>
    ),
  };

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id="es-grad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={c0} />
          <Stop offset="1" stopColor={c1} />
        </LinearGradient>
      </Defs>
      <Circle cx={70} cy={70} r={58} fill={palette.accentSoft} opacity={0.75} />
      <Circle cx={26} cy={24} r={9} fill={palette.teal} opacity={0.28} />
      <Circle cx={116} cy={116} r={13} fill={palette.secondary} opacity={0.3} />
      <Circle cx={116} cy={24} r={5} fill={palette.accent} opacity={0.22} />
      <Rect x={37} y={37} width={66} height={66} rx={22} fill="url(#es-grad)" />
      {glyphs[variant] || glyphs.leaf}
    </Svg>
  );
}

export default function EmptyState({
  variant = 'leaf',
  size = 132,
  title,
  subtitle,
  children,
  card = true,
  style,
}) {
  const palette = useThemeColors();
  return (
    <View
      style={[
        card && { backgroundColor: palette.surface, ...shadow.card, borderRadius: radius.xl },
        styles.box,
        style,
      ]}
    >
      <Illustration variant={variant} palette={palette} size={size} />
      {title ? (
        <Text style={[styles.title, { color: palette.textPrimary }]}>{title}</Text>
      ) : null}
      {subtitle ? (
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{subtitle}</Text>
      ) : null}
      {children ? <View style={styles.cta}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', paddingHorizontal: space.xl, paddingVertical: space.xxxxl },
  title: { fontSize: type.body, fontWeight: '700', marginTop: space.lg, textAlign: 'center' },
  subtitle: {
    fontSize: type.body,
    lineHeight: 22,
    marginTop: space.sm,
    textAlign: 'center',
  },
  cta: { marginTop: space.xl, alignSelf: 'stretch' },
});