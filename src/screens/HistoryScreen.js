import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getMeals, getDefecations, removeMeal, removeDefecation } from '../store/storage';
import { ScreenHeader, Card, Icon, FadeIn, CategoryModal } from '../ui';
import { useThemeColors, type, space } from '../theme';

const CATEGORIES = [
  { id: 'meal', label: 'Приёмы пищи', icon: 'food' },
  { id: 'defecation', label: 'Дефекации', icon: 'check' },
];
const ALL = CATEGORIES.map((c) => c.id);

function fmt(ms) {
  const d = new Date(ms);
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const palette = useThemeColors();
  const [meals, setMeals] = useState([]);
  const [defecations, setDefecations] = useState([]);
  const [filter, setFilter] = useState(ALL);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    setMeals(await getMeals());
    setDefecations(await getDefecations());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const mealItems = meals.map((m) => ({ ...m, kind: 'meal' })).sort((a, b) => b.timeMs - a.timeMs);
  const defItems = defecations.map((d) => ({ ...d, kind: 'defecation' })).sort((a, b) => b.timeMs - a.timeMs);
  const combined = [...mealItems, ...defItems].sort((a, b) => b.timeMs - a.timeMs);
  const filtered = combined.filter((item) => filter.includes(item.kind));

  async function onDelete(item) {
    if (item.kind === 'meal') setMeals(await removeMeal(item.id));
    else setDefecations(await removeDefecation(item.id));
  }

  const headerMeta = CATEGORIES.filter((c) => filter.includes(c.id))
    .map((c) => c.label)
    .join(' · ');

  function renderItem({ item, index }) {
    const isMeal = item.kind === 'meal';
    return (
      <FadeIn delay={Math.min(index * 45, 180)} translateY={8}>
        <Card style={[styles.row, { borderLeftColor: isMeal ? palette.accent : palette.success }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.time, { color: palette.textMuted }]}>{fmt(item.timeMs)}</Text>
          <View style={styles.nameRow}>
            {isMeal && item.photoUri ? (
              <Image source={{ uri: item.photoUri }} style={styles.thumb} />
            ) : isMeal && item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: palette.textPrimary }]}>
                {isMeal ? item.name : 'Дефекация'}
              </Text>
              {isMeal ? (
                <Text style={[styles.sub, { color: palette.textMuted }]}>
                  {item.kcal ? `${Math.round(item.kcal)} ккал` : ''}
                  {item.grams ? ` · ${item.grams} г` : ''}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => onDelete(item)}
          hitSlop={14}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel={`Удалить запись ${isMeal ? item.name : 'Дефекация'}`}
        >
          <Icon name="close" size={18} color={palette.danger} />
        </TouchableOpacity>
        </Card>
      </FadeIn>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <ScreenHeader title="История" subtitle="Приёмы пищи и дефекации" icon="history" />
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Выбрать категории"
          >
            <Icon name="friends" size={17} color={palette.accent} />
            <Text style={[styles.filterText, { color: palette.textPrimary }]}>Категории</Text>
            <View style={[styles.filterBadge, { backgroundColor: palette.accent }]}>
              <Text style={[styles.filterBadgeText, { color: palette.textOnAccent }]}>{filter.length}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text style={[styles.meta, { color: palette.textMuted }]} numberOfLines={1}>
          {filter.length === CATEGORIES.length ? 'Все категории' : headerMeta}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.kind}_${item.id}`}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="list" size={32} color={palette.textMuted} />
            <Text style={[styles.empty, { color: palette.textMuted }]}>
              {combined.length ? 'В этих категориях пока нет записей' : 'Пока нет записей'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />

      <CategoryModal
        visible={modalVisible}
        title="Категории"
        categories={CATEGORIES}
        selected={filter}
        onChange={setFilter}
        onClose={() => setModalVisible(false)}
        onApply={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 2,
  },
  filterText: { marginLeft: 6, fontSize: type.body, fontWeight: type.semibold },
  filterBadge: {
    marginLeft: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 11, fontWeight: type.semibold },
  meta: { fontSize: type.caption, marginTop: 4, marginBottom: 4 },
  list: { paddingHorizontal: space.xl, paddingBottom: 30 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    borderLeftWidth: 4,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -space.md,
  },
  time: { fontSize: type.caption, marginBottom: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 40, height: 40, borderRadius: 10, marginRight: 10 },
  name: { fontSize: 15, flexShrink: 1 },
  sub: { fontSize: 12, marginTop: 2 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  empty: { fontSize: type.body, marginTop: 12 },
});
