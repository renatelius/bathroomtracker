import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors, type, radius, space } from '../theme';

/** Редкость -> токены палитры (светлая/тёмная тема автоматически). */
function rarityStyle(rarity, palette) {
  switch (rarity) {
    case 'rare':
      return { tint: palette.accent, soft: palette.accentSoft };
    case 'epic':
      return { tint: palette.secondary, soft: palette.secondarySoft };
    case 'legendary':
      return { tint: palette.warningText, soft: palette.warningSoft };
    case 'common':
    default:
      return { tint: palette.textSecondary, soft: palette.surfaceAlt };
  }
}

/**
 * Карточка ачивки: цвет рамки/подложки по редкости, XP-бейдж.
 * `unlocked=false` — затемнённая карточка «не получено».
 */
export default function AchievementCard({ achievement, unlocked = false }) {
  const palette = useThemeColors();
  const rs = rarityStyle(achievement.rarity, palette);

  return (
    <View
      style={[
        styles.card,
        unlocked
          ? { backgroundColor: rs.soft, borderColor: rs.tint }
          : { backgroundColor: palette.surface, borderColor: palette.border, opacity: 0.5 },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: unlocked ? palette.textPrimary : palette.textMuted }]}>
          {achievement.title}
        </Text>
        {unlocked ? (
          <View style={[styles.xpBadge, { backgroundColor: rs.tint }]}>
            <Text style={[styles.xpText, { color: unlocked ? palette.textOnAccent : palette.textPrimary }]}>
              +{achievement.xp} XP
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.description, { color: unlocked ? palette.textSecondary : palette.textMuted }]}>
        {achievement.description}
      </Text>
      <Text style={[styles.state, { color: unlocked ? rs.tint : palette.textMuted }]}>
        {unlocked ? '✓ Получено!' : '🔒 Ещё не получено'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: space.lg,
    marginBottom: space.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.xs,
  },
  title: {
    fontSize: type.body,
    fontWeight: type.semibold,
    flex: 1,
    paddingRight: space.sm,
  },
  xpBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: 10,
  },
  xpText: { fontSize: type.caption, fontWeight: type.semibold },
  description: { fontSize: 14, lineHeight: 20 },
  state: { fontSize: type.caption, fontWeight: type.medium, marginTop: space.sm },
});