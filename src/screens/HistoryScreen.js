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
import { ScreenHeader, Card, Icon } from '../ui';
import { palette, type, space } from '../theme';

function fmt(ms) {
  const d = new Date(ms);
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const [meals, setMeals] = useState([]);
  const [defecations, setDefecations] = useState([]);

  const load = useCallback(async () => {
    setMeals(await getMeals());
    setDefecations(await getDefecations());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const mealItems = meals.map((m) => ({ ...m, kind: 'meal' })).sort((a, b) => b.timeMs - a.timeMs);
  const defItems = defecations.map((d) => ({ ...d, kind: 'defecation' })).sort((a, b) => b.timeMs - a.timeMs);
  const combined = [...mealItems, ...defItems].sort((a, b) => b.timeMs - a.timeMs);

  async function onDelete(item) {
    if (item.kind === 'meal') setMeals(await removeMeal(item.id));
    else setDefecations(await removeDefecation(item.id));
  }

  function renderItem({ item }) {
    const isMeal = item.kind === 'meal';
    return (
      <Card style={[styles.row, { borderLeftColor: isMeal ? palette.accent : palette.success }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.time}>{fmt(item.timeMs)}</Text>
          <View style={styles.nameRow}>
            {isMeal && item.photoUri ? (
              <Image source={{ uri: item.photoUri }} style={styles.thumb} />
            ) : isMeal && item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {isMeal ? item.name : 'Дефекация'}
              </Text>
              {isMeal ? (
                <Text style={styles.sub}>
                  {item.kcal ? `${Math.round(item.kcal)} ккал` : ''}
                  {item.grams ? ` · ${item.grams} г` : ''}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => onDelete(item)} hitSlop={8}>
          <Icon name="close" size={18} color={palette.danger} />
        </TouchableOpacity>
      </Card>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.header}>
        <ScreenHeader title="История" subtitle="Приёмы пищи и дефекации" icon="history" />
      </View>
      <FlatList
        data={combined}
        keyExtractor={(item) => `${item.kind}_${item.id}`}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="list" size={32} color={palette.textMuted} />
            <Text style={styles.empty}>Пока нет записей</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.bg },
  header: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.sm },
  list: { paddingHorizontal: space.xl, paddingBottom: 30 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    borderLeftWidth: 4,
  },
  time: { fontSize: type.caption, color: palette.textMuted, marginBottom: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 40, height: 40, borderRadius: 10, marginRight: 10, backgroundColor: palette.surfaceAlt },
  name: { fontSize: 15, color: palette.textPrimary, flexShrink: 1 },
  sub: { fontSize: 12, color: palette.textMuted, marginTop: 2 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  empty: { color: palette.textMuted, fontSize: type.body, marginTop: 12 },
});
