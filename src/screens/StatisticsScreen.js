import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { computeStats } from '../model/progression.mjs';
import { getDefecations } from '../store/storage';
import { ScreenHeader, Card, Section, Icon, FadeIn } from '../ui';
import { useThemeColors, type, space, radius, shadow } from '../theme';

const DAY = 24 * 3600e3;

function toDayKey(ms) {
  const d = new Date(ms);
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / DAY);
}

function buildHeatmap(defecations, weeks = 12) {
  const daySet = new Set(defecations.map((d) => toDayKey(d.timeMs)));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const chunks = [];
  const startDayKey = toDayKey(today.getTime()) - (weeks * 7 - 1);
  // Последняя колонка — текущая неделя; заполняем от понедельника
  const colStart = startDayKey + ((7 - today.getDay() + 1) % 7);
  // Строим колонки по понедельникам
  const firstMonday = colStart - 7 * weeks;
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let i = 0; i < 7; i++) {
      const key = firstMonday + w * 7 + i;
      col.push({
        key,
        date: key * DAY,
        has: daySet.has(key),
        future: key > toDayKey(Date.now()),
      });
    }
    chunks.push(col);
  }
  return chunks;
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function Heatmap({ chunks, palette }) {
  return (
    <View style={styles.heatWrap}>
      <View style={styles.heatGrid}>
        {chunks.map((col, ci) => (
          <View key={ci} style={styles.heatCol}>
            {col.map((cell) => (
              <View
                key={cell.key}
                style={[
                  styles.heatCell,
                  {
                    backgroundColor: cell.future
                      ? 'transparent'
                      : cell.has
                        ? palette.accent
                        : palette.accentSoft,
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legendRow}>
        <Text style={[styles.legendText, { color: palette.textMuted }]}>Меньше</Text>
        <View style={[styles.legendDot, { backgroundColor: palette.accentSoft }]} />
        <View style={[styles.legendDot, { backgroundColor: palette.accent }]} />
        <Text style={[styles.legendText, { color: palette.textMuted }]}>Больше</Text>
      </View>
    </View>
  );
}

export default function StatisticsScreen() {
  const palette = useThemeColors();
  const [defecations, setDefecations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(() => computeStats(defecations), [defecations]);
  const heatmap = useMemo(() => buildHeatmap(defecations), [defecations]);

  const weekdayCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const d of defecations) {
      const wd = (new Date(d.timeMs).getDay() + 6) % 7; // Пн = 0
      counts[wd]++;
    }
    const max = Math.max(...counts, 1);
    return counts.map((c) => ({ count: c, pct: c / max }));
  }, [defecations]);

  const avgText = stats.totalCount
    ? stats.avgIntervalH < 24
      ? `~${Math.round(stats.avgIntervalH)} ч`
      : `~${(stats.avgIntervalH / 24).toFixed(1)} дн.`
    : '—';

  const cards = [
    { label: 'Записей', value: String(stats.totalCount || 0), icon: 'list' },
    { label: 'Интервал', value: avgText, icon: 'clock' },
    { label: 'Серия', value: `${stats.currentStreak || 0} дн.`, icon: 'check' },
    { label: 'Рекорд', value: `${stats.bestStreak || 0} дн.`, icon: 'leaf' },
  ];

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

  const isEmpty = stats.totalCount === 0;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.container}
      >
        <ScreenHeader title="Статистика" subtitle="Ритуалы и ритм" icon="chart" />

        <FadeIn>
          <View style={styles.statGrid}>
            {cards.map((c) => (
              <View key={c.label} style={[styles.statBox, { backgroundColor: palette.surface, ...shadow.card }]}>
                <View style={[styles.statIcon, { backgroundColor: palette.accentSoft }]}>
                  <Icon name={c.icon} size={18} color={palette.accent} />
                </View>
                <Text style={[styles.statValue, { color: palette.textPrimary }]}>{c.value}</Text>
                <Text style={[styles.statLabel, { color: palette.textSecondary }]}>{c.label}</Text>
              </View>
            ))}
          </View>
        </FadeIn>

        <Section
          title="Карта активности"
          right={
            stats.activeDays > 0 ? (
              <Text style={{ fontSize: 13, fontWeight: '500', color: palette.textSecondary }}>
                {stats.activeDays} {stats.activeDays === 1 ? 'день' : stats.activeDays < 5 ? 'дня' : 'дней'}
              </Text>
            ) : null
          }
        />
        <Card tone="default">
          {isEmpty ? (
            <View style={styles.emptyRow}>
              <Icon name="leaf" size={22} color={palette.accent} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                Пока пусто. Добавьте записи — и здесь появится карта ваших дней.
              </Text>
            </View>
          ) : (
            <Heatmap chunks={heatmap} palette={palette} />
          )}
        </Card>

        <Section title="Ритм недели" />
        <Card tone="default">
          {isEmpty ? (
            <View style={styles.emptyRow}>
              <Icon name="chart" size={22} color={palette.accent} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                Данных пока недостаточно.
              </Text>
            </View>
          ) : (
            <View>
              {WEEKDAY_LABELS.map((label, i) => (
                <View key={label} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: palette.textPrimary }]}>{label}</Text>
                  <View style={[styles.barTrack, { backgroundColor: palette.surfaceAlt }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          backgroundColor: palette.accent,
                          width: `${Math.max(8, weekdayCounts[i].pct * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barCount, { color: palette.textSecondary }]}>{weekdayCounts[i].count}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Section title="Регулярность" />
        <Card tone="default">
          <View style={styles.consistencyRow}>
            <View style={styles.consistencyTextWrap}>
              <Text style={[styles.consistencyValue, { color: palette.textPrimary }]}>
                {Math.round((stats.consistencyPct || 0) * 100)}%
              </Text>
              <Text style={[styles.consistencyLabel, { color: palette.textSecondary }]}>
                дней с записями от всех наблюдаемых
              </Text>
            </View>
            <View style={[styles.consistencyRing, { borderColor: palette.accent }]}>
              <Text style={[styles.consistencyInner, { color: palette.accent }]}>
                {Math.round((stats.consistencyPct || 0) * 100)}%
              </Text>
            </View>
          </View>
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Разброс интервалов: ±{stats.intervalStdH ? stats.intervalStdH.toFixed(1) : '—'} ч — чем меньше, тем ритмичнее ваш день.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: space.xl, paddingTop: 16 },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  statBox: {
    width: '48.5%',
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  statValue: { fontSize: type.title, fontWeight: type.heavy, letterSpacing: -0.4 },
  statLabel: { fontSize: type.label, marginTop: 2 },

  heatWrap: { alignItems: 'center' },
  heatGrid: { flexDirection: 'row' },
  heatCol: { marginRight: 4 },
  heatCell: {
    width: 12,
    height: 12,
    borderRadius: 4,
    marginBottom: 4,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: space.sm },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginLeft: 6,
  },
  legendText: { fontSize: type.caption, marginLeft: 6 },

  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  barLabel: { width: 34, fontSize: type.label, fontWeight: '600' },
  barTrack: {
    flex: 1,
    height: 14,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginHorizontal: space.md,
  },
  barFill: { height: '100%', borderRadius: radius.pill },
  barCount: { width: 28, fontSize: type.label, textAlign: 'right' },

  consistencyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg },
  consistencyTextWrap: { flex: 1 },
  consistencyValue: { fontSize: type.title, fontWeight: type.heavy },
  consistencyLabel: { fontSize: type.label, marginTop: 2, lineHeight: 17 },
  consistencyRing: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consistencyInner: { fontSize: type.section, fontWeight: type.semibold },

  emptyRow: { flexDirection: 'row', alignItems: 'center' },
  emptyText: { fontSize: type.body, marginLeft: space.md, flex: 1, lineHeight: 22 },

  hint: { fontSize: type.caption, lineHeight: 17 },
});