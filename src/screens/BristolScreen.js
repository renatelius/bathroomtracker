import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getDefecations } from '../store/storage';
import { ScreenHeader, Card, Section, Icon, FadeIn, EmptyState } from '../ui';
import { BristolGlyphLarge, BristolHeatmap, BRISTOL_META } from '../ui/BristolArt';
import { useThemeColors, type, space, radius, shadow } from '../theme';

const DAY = 24 * 3600e3;
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function toDayKey(ms) {
  const d = new Date(ms);
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / DAY);
}

function weekdayOf(ms) {
  return (new Date(ms).getDay() + 6) % 7; // Пн = 0
}

function buildTypeDayMatrix(defecations) {
  const matrix = [];
  for (let t = 0; t < 7; t++) {
    const row = new Array(7).fill(0);
    for (const d of defecations) {
      if (d.bristol === t + 1) row[weekdayOf(d.timeMs)]++;
    }
    matrix.push(row);
  }
  return matrix;
}

function buildWeeklyTrend(defecations, weeks = 8) {
  const byWeek = new Map();
  const startKey = toDayKey(Date.now()) - weeks * 7;
  for (const d of defecations) {
    const key = toDayKey(d.timeMs);
    if (key < startKey || d.bristol < 1 || d.bristol > 7) continue;
    const idx = Math.floor((key - startKey) / 7);
    if (!byWeek.has(idx)) byWeek.set(idx, [0, 0, 0, 0, 0, 0, 0]);
    byWeek.get(idx)[d.bristol - 1]++;
  }
  const trend = [];
  for (let i = 0; i < weeks; i++) {
    const counts = byWeek.get(i) || [0, 0, 0, 0, 0, 0, 0];
    const total = counts.reduce((s, c) => s + c, 0);
    let leader = 0;
    let max = -1;
    for (let j = 0; j < 7; j++) {
      if (counts[j] > max) { max = counts[j]; leader = j + 1; }
    }
    trend.push({ week: i + 1, total, leader: total === 0 ? null : leader });
  }
  return trend;
}

function buildBristolStats(defecations) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const comfortByType = new Map();
  for (const d of defecations) {
    if (d.bristol < 1 || d.bristol > 7) continue;
    counts[d.bristol - 1]++;
    if (d.comfort != null && d.comfort >= 1 && d.comfort <= 5) {
      comfortByType.set(d.bristol, (comfortByType.get(d.bristol) || 0) + d.comfort);
    }
  }
  const rated = counts.reduce((s, c) => s + c, 0);
  const maxType = counts.reduce((best, c, i) => (c > counts[best] ? i : best), 0);
  return {
    counts,
    rated,
    maxType: rated === 0 ? null : maxType + 1,
    avgComfortByType: (t) => {
      const sum = comfortByType.get(t);
      const n = counts[t - 1];
      return sum != null && n > 0 ? sum / n : null;
    },
  };
}

function DistributionBar({ id, count, max, palette }) {
  const meta = BRISTOL_META[id - 1] || {};
  const normal = id === 4;
  const pct = count > 0 ? Math.max(10, (count / max) * 100) : 0;
  const color = normal ? palette.success : palette.accent;
  return (
    <View
      style={styles.distRow}
      accessibilityRole="none"
      accessibilityLabel={`Тип ${id}: ${count} записей`}
    >
      <BristolGlyphLarge id={id} color={color} size={26} />
      <Text style={[styles.distLabel, { color: palette.textPrimary }]} numberOfLines={1}>
        {meta.label || `Тип ${id}`}
        {normal ? ' · норма' : ''}
      </Text>
      <View style={[styles.distTrack, { backgroundColor: palette.surfaceAlt }]}>
        <View
          style={[styles.distFill, { backgroundColor: color, width: `${pct}%` }]}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max, now: count, text: `${count}` }}
        />
      </View>
      <Text style={[styles.distCount, { color: palette.textSecondary }]}>{count}</Text>
    </View>
  );
}

export default function BristolScreen() {
  const palette = useThemeColors();
  const [defecations, setDefecations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(() => buildBristolStats(defecations), [defecations]);
  const matrix = useMemo(() => buildTypeDayMatrix(defecations), [defecations]);
  const trend = useMemo(() => buildWeeklyTrend(defecations), [defecations]);

  const load = useCallback(async () => {
    setDefecations(await getDefecations());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const isEmpty = stats.rated === 0;
  const ratedTotal = stats.rated;
  const bestMeta = stats.maxType ? BRISTOL_META[stats.maxType - 1] : null;
  const bestCount = stats.maxType ? stats.counts[stats.maxType - 1] : 0;
  const avgComfortAll = defecations.filter((d) => d.comfort != null).reduce((acc, d, i, arr) => {
    acc += d.comfort;
    if (i === arr.length - 1) return acc / arr.length;
    return acc;
  }, 0) || null;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.container}
      >
        <ScreenHeader title="Бристоль" subtitle="Детальная аналитика по шкале" icon="chart" />

        {isEmpty ? (
          <FadeIn>
            <EmptyState
              variant="chart"
              title="Пока нет данных Бристоля"
              subtitle="Укажите тип при записи дефекации — здесь появятся распределение, теплокарта недели и тренд."
            />
          </FadeIn>
        ) : (
          <>
            {/* 1. Hero: доминирующий тип */}
            <FadeIn>
              <View
                style={[styles.heroCard, { backgroundColor: palette.surface, ...shadow.card }]}
                accessibilityRole="none"
              >
                <View style={[styles.heroGlyphWrap, { backgroundColor: palette.accentSoft }]}>
                  <BristolGlyphLarge
                    id={stats.maxType}
                    color={stats.maxType === 4 ? palette.success : palette.accent}
                    size={104}
                  />
                </View>
                <View style={styles.heroText}>
                  <Text style={[styles.heroCaption, { color: palette.textSecondary }]}>
                    Самый частый тип
                  </Text>
                  <Text style={[styles.heroTitle, { color: palette.textPrimary }]}>
                    {bestMeta ? bestMeta.label : ''}
                  </Text>
                  <Text style={[styles.heroCount, { color: palette.textSecondary }]}>
                    {bestCount} из {ratedTotal} записей
                  </Text>
                  {avgComfortAll != null ? (
                    <Text style={[styles.heroComfort, { color: palette.textSecondary }]}>
                      Средний комфорт: {avgComfortAll.toFixed(1)}/5
                    </Text>
                  ) : null}
                </View>
              </View>
            </FadeIn>

            {/* 2. Распределение по типам */}
            <Section title="Распределение типов" value={`${ratedTotal} зап.`} />
            <Card tone="default">
              <View>
                {[1, 2, 3, 4, 5, 6, 7].map((t) => (
                  <DistributionBar
                    key={t}
                    id={t}
                    count={stats.counts[t - 1]}
                    max={stats.counts[stats.maxType - 1]}
                    palette={palette}
                  />
                ))}
                <Text style={[styles.hint, { color: palette.textMuted }]}>
                  Тип 4 (гладкая колбаска) считается нормой.
                </Text>
              </View>
            </Card>

            {/* 3. Теплокарта тип x день недели */}
            <Section title="Теплокарта недели" />
            <Card tone="default">
              <BristolHeatmap matrix={matrix} palette={palette} />
            </Card>

            {/* 4. Тренд за 8 недель */}
            <Section title="Тренд за 8 недель" />
            <Card tone="default">
              <View>
                {trend.map((w) => (
                  <View key={w.week} style={styles.trendRow}>
                    <Text style={[styles.trendWeek, { color: palette.textSecondary }]}>
                      Неделя {w.week}
                    </Text>
                    {w.leader ? (
                      <View style={styles.trendLeader}>
                        <BristolGlyphLarge id={w.leader} color={palette.accent} size={24} />
                        <Text style={[styles.trendLeaderName, { color: palette.textPrimary }]}>
                          {BRISTOL_META[w.leader - 1].label}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.trendNone, { color: palette.textMuted }]}>—</Text>
                    )}
                    <Text style={[styles.trendTotal, { color: palette.textSecondary }]}>
                      {w.total} зап.
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: space.xl, paddingTop: 16 },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    padding: space.xl,
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  heroGlyphWrap: {
    borderRadius: radius.pill,
    padding: space.sm,
    marginRight: space.lg,
  },
  heroText: { flex: 1 },
  heroCaption: { fontSize: type.label, fontWeight: '500', marginBottom: 2 },
  heroTitle: { fontSize: type.title, fontWeight: type.heavy, letterSpacing: -0.4 },
  heroCount: { fontSize: type.body, marginTop: 4 },
  heroComfort: { fontSize: type.body, marginTop: 2 },

  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  distLabel: { width: 120, fontSize: type.label, fontWeight: '500' },
  distTrack: {
    flex: 1,
    height: 14,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginHorizontal: space.sm,
  },
  distFill: { height: '100%', borderRadius: radius.pill },
  distCount: { width: 30, fontSize: type.label, textAlign: 'right' },

  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  trendWeek: { width: 82, fontSize: type.label, fontWeight: '500' },
  trendLeader: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  trendLeaderName: { fontSize: type.label, marginLeft: space.sm },
  trendNone: { flex: 1, fontSize: type.label },
  trendTotal: { width: 52, fontSize: type.label, textAlign: 'right' },

  hint: { fontSize: type.caption, lineHeight: 17, marginTop: space.sm },
});