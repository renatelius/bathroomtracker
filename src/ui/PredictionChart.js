import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { useThemeColors, type, radius, space } from '../theme';
import FadeIn from './FadeIn';

/**
 * Кинематографичный график прогноза с окном достоверности.
 *
 * Семантика: по оси X — последние интервалы между дефекациями + прогноз,
 * по оси Y — длительность интервала в часах. Прогнозная точка рисуется с
 * вертикальной полосой «окна достоверности» (low..high из модели).
 *
 * @param {{timeMs: number}[]} defecations
 * @param {{predictedAtMs, intervalH, lowMs, highMs, confidenceH}|null} prediction
 */
export default function PredictionChart({ defecations = [], prediction }) {
  const palette = useThemeColors();
  const [width, setWidth] = useState(320);

  if (!prediction) return null;

  const times = defecations
    .map((d) => d && d.timeMs)
    .filter((t) => typeof t === 'number' && t > 0)
    .sort((a, b) => a - b);

  const intervals = [];
  for (let i = 1; i < times.length; i++) {
    intervals.push(Math.round(((times[i] - times[i - 1]) / 3600e3) * 10) / 10);
  }

  const forecastH = Math.round(prediction.intervalH * 10) / 10;
  const lowH = Math.max(0, (prediction.lowMs - Date.now()) / 3600e3);
  const highH = (prediction.highMs - Date.now()) / 3600e3;

  // Confidence в процентах: чем уже окно относительно прогноза, тем выше.
  const confRatio = prediction.intervalH > 0 ? prediction.confidenceH / prediction.intervalH : 0.5;
  const confidence = Math.max(8, Math.min(98, Math.round((1 - confRatio) * 100)));

  // Последние N интервалов + точка прогноза.
  const series = [...intervals.slice(-6), forecastH];
  const pointsCount = series.length;

  // Данных нет вообще — только точка прогноза.
  const noHistory = intervals.length === 0;

  // ------- масштаб -------
  const maxV = Math.max(...series, highH, 4);
  const yMax = Math.max(4, Math.ceil(maxV / 4) * 4);

  const H = 200;
  const padT = 16;
  const padB = 10;
  const padL = 34;
  const padR = 14;
  const innerW = Math.max(80, width - padL - padR);
  const innerH = H - padT - padB;
  const w = Math.max(80, width);

  const x = (i) => padL + (pointsCount <= 1 ? 0.5 : i / (pointsCount - 1)) * innerW;
  const y = (v) => padT + innerH - (v / yMax) * innerH;

  const px = series.map((v, i) => [x(i), y(v)]);
  const line = px.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${px[px.length - 1][0].toFixed(1)} ${H} L${px[0][0].toFixed(1)} ${H} Z`;

  const xf = x(pointsCount - 1);
  const yForecast = y(forecastH);
  const yLow = y(lowH);
  const yHigh = y(highH);

  const gradId = 'prediction-area-grad';

  const fmtTime = (ms) =>
    new Date(ms).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const hoursFromNow = (ms) => {
    const h = Math.round((ms - Date.now()) / 3600e3);
    const hh = Math.floor(h / 24);
    const rem = h % 24;
    if (hh <= 0) return rem;
    return `${hh}д ${rem}ч`;
  };

  return (
    <FadeIn key={String(prediction.predictedAtMs)} translateY={22} style={styles.fade}>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface },
          // ✨ Кинематографичное свечение контуром акцента (аура подхватывается автоматически).
          { shadowColor: palette.accent, shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
        ]}
      >
        {/* Заголовок + процент уверенности */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>Прогноз активности</Text>
          <View style={[styles.confBadge, { backgroundColor: palette.accentSoft }]}>
            <Text style={[styles.confText, { color: palette.accent }]}>
              Уверенность: {confidence}%
            </Text>
          </View>
        </View>

        {noHistory ? (
          <View style={[styles.empty, { backgroundColor: palette.surfaceAlt }]}>
            <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>
              Мало данных для графика
            </Text>
            <Text style={[styles.emptySub, { color: palette.textMuted }]}>
              Добавьте минимум 2 записи — и здесь появится линия вашего ритма.
            </Text>
          </View>
        ) : (
          <View
            style={{ width: '100%', marginTop: space.sm }}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0) setWidth(w);
            }}
          >
            <Svg width={w} height={H}>
              <Defs>
                <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={palette.accent} stopOpacity={0.22} />
                  <Stop offset="1" stopColor={palette.accent} stopOpacity={0.02} />
                </LinearGradient>
              </Defs>

              {/* Сетка */}
              {[0, 0.5, 1].map((f) => {
                const gy = padT + innerH * f;
                return (
                  <Line
                    key={f}
                    x1={padL}
                    y1={gy}
                    x2={padL + innerW}
                    y2={gy}
                    stroke={palette.border}
                    strokeWidth={1}
                    strokeDasharray="4 5"
                  />
                );
              })}

              {/* Подписи часов */}
              {[0, 0.5, 1].map((f) => {
                const gy = padT + innerH * f;
                const val = Math.round(yMax * (1 - f));
                return (
                  <SvgText key={`l${f}`} x={padL - 8} y={gy + 4} fill={palette.textMuted} fontSize={10} textAnchor="end">
                    {val}ч
                  </SvgText>
                );
              })}

              {/* Зона под линией */}
              {!noHistory ? <Path d={area} fill={`url(#${gradId})`} /> : null}

              {/* Линия фактических интервалов */}
              {!noHistory ? (
                <Path
                  d={line}
                  fill="none"
                  stroke={palette.accent}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {/* Окно достоверности: полоса low..high */}
              <Rect
                x={xf - 9}
                y={yHigh}
                width={18}
                height={Math.max(2, yLow - yHigh)}
                rx={9}
                fill={palette.teal}
                opacity={0.18}
              />
              <Line x1={xf} y1={yHigh} x2={xf} y2={yLow} stroke={palette.teal} strokeWidth={1.5} strokeDasharray="3 3" />

              {/* Пунктир уровня прогноза */}
              <Line
                x1={padL}
                y1={yForecast}
                x2={xf}
                y2={yForecast}
                stroke={palette.teal}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                opacity={0.7}
              />

              {/* Фактические точки */}
              {!noHistory
                ? px.slice(0, -1).map((p, i) => (
                    <Circle
                      key={i}
                      cx={p[0]}
                      cy={p[1]}
                      r={4.5}
                      fill={palette.bg}
                      stroke={palette.accent}
                      strokeWidth={2.5}
                    />
                  ))
                : null}

              {/* Точка прогноза со свечением */}
              <Circle cx={xf} cy={yForecast} r={11} fill={palette.teal} opacity={0.16} />
              <Circle cx={xf} cy={yForecast} r={5.5} fill={palette.bg} stroke={palette.teal} strokeWidth={2.5} />
            </Svg>
          </View>
        )}

        {/* Легенда */}
        {!noHistory ? (
          <View style={styles.legend}>
            <LegendItem color={palette.accent} label="Ритм (интервалы)" />
            <LegendItem color={palette.teal} label="Окно достоверности" />
          </View>
        ) : null}

        {/* Временное окно прогноза */}
        <View style={[styles.timeWindow, { backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.timeLabel, { color: palette.textMuted }]}>Ожидаемый диапазон</Text>
          <Text style={[styles.timeRange, { color: palette.textPrimary }]}>
            {fmtTime(prediction.lowMs)} — {fmtTime(prediction.highMs)}
            <Text style={[styles.timeHint, { color: palette.textMuted }]}>
              {'  '}через {hoursFromNow(prediction.lowMs)}–{hoursFromNow(prediction.highMs)}
            </Text>
          </Text>
        </View>
      </View>
    </FadeIn>
  );
}

function LegendItem({ color, label }) {
  const palette = useThemeColors();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: palette.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { marginTop: space.lg },
  card: {
    borderRadius: radius.lg,
    padding: space.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: type.section, fontWeight: type.semibold },
  confBadge: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  confText: { fontSize: type.label, fontWeight: type.semibold },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: space.md,
    gap: space.xl,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: type.caption },
  timeWindow: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  timeLabel: { fontSize: type.caption, marginBottom: 4 },
  timeRange: { fontSize: type.body, fontWeight: type.semibold },
  timeHint: { fontSize: type.caption, fontWeight: type.regular },
  empty: {
    marginTop: space.md,
    borderRadius: radius.sm,
    padding: space.lg,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: type.body, fontWeight: type.semibold },
  emptySub: { fontSize: type.caption, marginTop: 6, textAlign: 'center', lineHeight: 18 },
});