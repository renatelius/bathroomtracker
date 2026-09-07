import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ACHIEVEMENTS, xpToNextLevel, checkAndAwardAchievements } from '../services/achievements';
import { ScreenHeader, Card, Section, FadeIn, AchievementCard } from '../ui';
import { useThemeColors, type, space, radius, shadow } from '../theme';

export default function AchievementsScreen() {
  const palette = useThemeColors();
  const [progress, setProgress] = useState(null);

  const load = useCallback(async () => {
    // Пересчитываем статистику и сразу награждаем за уже накопленные данные.
    setProgress(await checkAndAwardAchievements());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!progress) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
        <Text style={[styles.loading, { color: palette.textMuted }]}>Загрузка прогресса…</Text>
      </SafeAreaView>
    );
  }

  const xpInfo = xpToNextLevel(progress.xp);
  const unlockedCount = progress.unlocked.length;
  const totalCount = ACHIEVEMENTS.length;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Достижения" subtitle="XP, уровни и награды" icon="history" />

        {/* Профиль игрока */}
        <FadeIn>
          <LinearGradient
            colors={palette.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.profileCard, { borderRadius: radius.xl, ...shadow.accent }]}
          >
            <View style={[styles.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Text style={[styles.avatarText, { color: palette.textOnAccent }]}>Lv.{progress.level}</Text>
            </View>
            <Text style={[styles.profileName, { color: palette.textOnAccent }]}>Мастер ритма</Text>
            <Text style={[styles.profileXp, { color: 'rgba(255,255,255,0.85)' }]}>
              {progress.xp} XP всего
            </Text>

            <View style={styles.xpBarContainer}>
              <View style={[styles.xpBarBg, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <View
                  style={[
                    styles.xpBarFill,
                    { backgroundColor: '#FFFFFF', width: `${Math.max(3, xpInfo.percent)}%` },
                  ]}
                />
              </View>
              <Text style={[styles.xpBarText, { color: 'rgba(255,255,255,0.9)' }]}>
                {xpInfo.current} / {xpInfo.needed} до ур. {progress.level + 1}
              </Text>
            </View>
          </LinearGradient>
        </FadeIn>

        {/* Статистика */}
        <View style={styles.statsRow}>
          <StatBox label="Получено" value={`${unlockedCount}/${totalCount}`} emoji="🏆" palette={palette} />
          <StatBox label="Дней" value={progress.stats.totalDays} emoji="📅" palette={palette} />
          <StatBox label="Серия" value={progress.stats.bestStreak} emoji="🔥" palette={palette} />
        </View>

        <Section title="Достижения" right={`${unlockedCount} из ${totalCount}`} />
        {ACHIEVEMENTS.map((ach, i) => (
          <FadeIn key={ach.id} delay={Math.min(i * 40, 200)} translateY={10}>
            <AchievementCard achievement={ach} unlocked={progress.unlocked.includes(ach.id)} />
          </FadeIn>
        ))}

        <Card tone="info">
          <Text style={[styles.infoText, { color: palette.textSecondary }]}>
            Ачивки начисляются автоматически по данным дневника — просто продолжайте
            вести записи, и награды не заставят себя ждать.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, emoji, palette }) {
  return (
    <View style={[styles.statBox, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color: palette.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: space.xl, paddingTop: 16, paddingBottom: 40 },
  loading: { textAlign: 'center', marginTop: 60 },
  profileCard: {
    padding: space.xxl,
    alignItems: 'center',
    marginBottom: space.lg,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  avatarText: { fontSize: 24, fontWeight: type.heavy },
  profileName: { fontSize: 20, fontWeight: type.semibold, marginBottom: 4 },
  profileXp: { fontSize: type.label, marginBottom: space.lg },
  xpBarContainer: { width: '100%' },
  xpBarBg: {
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  xpBarFill: { height: '100%', borderRadius: radius.pill },
  xpBarText: {
    fontSize: type.caption,
    textAlign: 'center',
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.sm,
  },
  statBox: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
    alignItems: 'center',
  },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: type.semibold },
  statLabel: { fontSize: type.caption, marginTop: 2 },
  infoText: { fontSize: type.label, lineHeight: 18 },
});