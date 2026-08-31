import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors, type, space, radius } from '../theme';
import Icon from './Icon';
import Card from './Card';

/**
 * Компактная карточка прогресса/геймификации: серия дней, консистентность,
 * достижения по количеству записей и стабильности ритма.
 *
 * `stats`: {totalCount, activeDays, currentStreak, bestStreak, consistencyPct,
 *           avgIntervalH, intervalStdH, hasHistory}
 * `milestones`: [{id, label, done}]
 */
export default function ProgressionCard({ stats, milestones, style }) {
  const palette = useThemeColors();

  const nextMilestone = milestones.find((m) => !m.done);
  const doneCount = milestones.filter((m) => m.done).length;

  const a11yLabel = `Прогресс: серия ${stats.currentStreak} дней подряд, рекорд ${stats.bestStreak} дней. ` +
    `Всего записей ${stats.totalCount}. ` +
    (stats.hasHistory ? `Регулярность ведения ${stats.consistencyPct} процентов. ` : '') +
    `Достижения: ${doneCount} из ${milestones.length}.`;

  return (
    <Card style={style} accessible accessibilityLabel={a11yLabel}>
      <View style={styles.topRow}>
        <View style={[styles.streakBadge, { backgroundColor: palette.accentSoft }]}>
          <Icon name="flame" size={20} color={palette.accent} strokeWidth="regular" />
          <Text style={[styles.streakNum, { color: palette.accent }]}>{stats.currentStreak}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: space.md }}>
          <Text style={[styles.streakLabel, { color: palette.textPrimary }]}>
            {stats.currentStreak === 0 ? 'Начните серию' : 'Дней подряд'}
          </Text>
          <Text style={[styles.streakSub, { color: palette.textMuted }]}>
            {stats.totalCount > 0
              ? `рекорд: ${stats.bestStreak} · записей: ${stats.totalCount}`
              : 'Записывайте дефекации, чтобы видеть прогресс'}
          </Text>
        </View>
      </View>

      {stats.hasHistory && (
        <View style={styles.metrics}>
          <View style={[styles.metric, { backgroundColor: palette.surfaceAlt }]}>
            <Text style={[styles.metricVal, { color: palette.textPrimary }]}>{stats.consistencyPct}%</Text>
            <Text style={[styles.metricCap, { color: palette.textMuted }]}>регулярность</Text>
          </View>
          <View style={[styles.metric, { backgroundColor: palette.surfaceAlt }]}>
            <Text style={[styles.metricVal, { color: palette.textPrimary }]}>
              {stats.avgIntervalH ? `~${stats.avgIntervalH} ч` : '—'}
            </Text>
            <Text style={[styles.metricCap, { color: palette.textMuted }]}>средний интервал</Text>
          </View>
        </View>
      )}

      {milestones.length > 0 && (
        <View style={styles.milestones}>
          <View style={styles.milHead}>
            <Text style={[styles.milTitle, { color: palette.textSecondary }]}>Достижения</Text>
            <Text style={[styles.milCount, { color: palette.accent }]}>
              {doneCount}/{milestones.length}
            </Text>
          </View>
          <View style={styles.milChips}>
            {milestones.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.milChip,
                  {
                    backgroundColor: m.done ? palette.accentSoft : palette.surfaceAlt,
                    borderColor: m.done ? palette.accent : palette.border,
                  },
                ]}
              >
                {m.done && <Icon name="check" size={12} color={palette.accent} />}
                <Text
                  style={[
                    styles.milChipText,
                    { color: m.done ? palette.accent : palette.textMuted },
                  ]}
                >
                  {m.label}
                </Text>
              </View>
            ))}
          </View>
          {nextMilestone && (
            <Text style={[styles.nextHint, { color: palette.textMuted }]}>
              Следующее: «{nextMilestone.label}»
            </Text>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center' },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  streakNum: { fontSize: 26, fontWeight: type.heavy, marginLeft: 6 },
  streakLabel: { fontSize: type.body, fontWeight: type.semibold },
  streakSub: { fontSize: type.caption, marginTop: 2 },

  metrics: { flexDirection: 'row', marginTop: space.md, gap: space.sm },
  metric: { flex: 1, borderRadius: 12, padding: space.md, alignItems: 'center' },
  metricVal: { fontSize: 18, fontWeight: type.semibold },
  metricCap: { fontSize: type.caption, marginTop: 2 },

  milestones: { marginTop: space.lg },
  milHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  milTitle: { fontSize: type.label, fontWeight: type.semibold },
  milCount: { fontSize: type.body, fontWeight: type.semibold },
  milChips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm, gap: 8 },
  milChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  milChipText: { fontSize: 12, fontWeight: type.medium },
  nextHint: { fontSize: 12, marginTop: space.sm },
});
