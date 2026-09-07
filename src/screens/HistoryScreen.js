import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getMeals, getDefecations, removeMeal, removeDefecation } from '../store/storage';
import { generateHealthReport } from '../services/reportService';
import { ScreenHeader, Card, Button, Icon, FadeIn, CategoryModal, EmptyState } from '../ui';
import { useThemeColors, type, space, radius } from '../theme';

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
  const [exporting, setExporting] = useState(false);

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

  async function onExport() {
    if (exporting) return;
    setExporting(true);
    try {
      await generateHealthReport(30);
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось сформировать отчёт. Попробуйте ещё раз.');
    } finally {
      setExporting(false);
    }
  }

  function toggleFilter(id) {
    const has = filter.includes(id);
    let next = has ? filter.filter((x) => x !== id) : [...filter, id];
    if (next.length === 0) next = ALL;
    setFilter(next);
  }

  const allActive = filter.length >= CATEGORIES.length;

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
              ) : item.bristol ? (
                <Text style={[styles.sub, { color: palette.textMuted }]}>
                  Тип {item.bristol} по Бристолю{item.comfort ? ` · комфорт ${item.comfort}/5` : ''}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => onDelete(item)}
          hitSlop={6}
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
        <Text style={[styles.meta, { color: palette.textSecondary }]} numberOfLines={1}>
          {allActive ? 'Все категории' : headerMeta}
        </Text>
        <View style={styles.chipRow}>
          <FilterChip
            label="Все"
            active={allActive}
            onPress={() => setFilter(ALL)}
            palette={palette}
          />
          {CATEGORIES.map((c) => (
            <FilterChip
              key={c.id}
              label={c.label}
              active={filter.includes(c.id)}
              onPress={() => toggleFilter(c.id)}
              palette={palette}
            />
          ))}
        </View>
      </View>

      <View style={[styles.exportWrap, { backgroundColor: palette.bg }]}>
        <Card tone="default">
          <View style={styles.exportCard}>
            <View style={styles.exportText}>
              <Text style={[styles.exportTitle, { color: palette.textPrimary }]}>
                Экспорт для врача
              </Text>
              <Text style={[styles.exportSubtitle, { color: palette.textMuted }]}>
                PDF-отчёт за последние 30 дней
              </Text>
            </View>
            <Button
              title={exporting ? 'Формируем…' : 'Сгенерировать PDF'}
              icon="chart"
              loading={exporting}
              disabled={exporting}
              onPress={onExport}
              style={styles.exportBtn}
            />
          </View>
        </Card>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.kind}_${item.id}`}
        renderItem={renderItem}
        ListEmptyComponent={
          combined.length === 0 ? (
            <EmptyState
              variant="history"
              title="Пока нет записей"
              subtitle="Добавьте первую запись — и история начнёт складываться."
              style={styles.emptyBox}
            />
          ) : (
            <View style={styles.emptyBox}>
              <View style={[styles.emptyIcon, { backgroundColor: palette.accentSoft }]}>
                <Icon name="list" size={26} color={palette.accent} />
              </View>
              <Text style={[styles.empty, { color: palette.textPrimary }]}>
                В этих категориях пока нет записей
              </Text>
            </View>
          )
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

function FilterChip({ label, active, onPress, palette }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.filterChip,
        active
          ? { backgroundColor: palette.accent, borderColor: palette.accent }
          : { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.filterChipText,
          { color: active ? palette.textOnAccent : palette.textPrimary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  chipRow: { flexDirection: 'row', marginTop: space.sm, gap: 8 },
  filterChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: { fontSize: type.label, fontWeight: '600' },
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
  exportWrap: { paddingHorizontal: space.xl, paddingBottom: space.sm },
  exportCard: { flexDirection: 'row', alignItems: 'center' },
  exportText: { flex: 1, paddingRight: space.lg },
  exportTitle: { fontSize: type.body, fontWeight: type.semibold },
  exportSubtitle: { fontSize: type.caption, marginTop: 3, lineHeight: 17 },
  exportBtn: { minWidth: 168 },
  list: { paddingHorizontal: space.xl, paddingBottom: 30 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    borderLeftWidth: 4,
  },
  deleteBtn: {
    width: 48,
    height: 48,
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
  emptyBox: { alignItems: 'center', marginTop: 72, paddingHorizontal: space.xl },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: type.body, fontWeight: '600', marginTop: 14, textAlign: 'center' },
  emptySub: { fontSize: type.label, marginTop: 6, textAlign: 'center', lineHeight: 18 },
});
