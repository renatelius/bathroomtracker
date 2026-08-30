import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getMeals, getDefecations, removeMeal, removeDefecation } from '../store/storage';

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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const mealItems = meals
    .map((m) => ({ ...m, kind: 'meal' }))
    .sort((a, b) => b.timeMs - a.timeMs);
  const defItems = defecations
    .map((d) => ({ ...d, kind: 'defecation' }))
    .sort((a, b) => b.timeMs - a.timeMs);

  const combined = [...mealItems, ...defItems].sort((a, b) => b.timeMs - a.timeMs);

  async function onDelete(item) {
    if (item.kind === 'meal') setMeals(await removeMeal(item.id));
    else setDefecations(await removeDefecation(item.id));
  }

  function renderItem({ item }) {
    const isMeal = item.kind === 'meal';
    return (
      <View style={[styles.row, isMeal ? styles.meal : styles.def]}>
        <Text style={styles.time}>{fmt(item.timeMs)}</Text>
        <View style={{ flex: 1 }}>
          {isMeal ? (
            <>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>
                {item.kcal ? `${Math.round(item.kcal)} ккал` : ''}
                {item.grams ? ` · ${item.grams} г` : ''}
              </Text>
            </>
          ) : (
            <Text style={styles.name}>Дефекация</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => onDelete(item)}>
          <Text style={styles.delete}>Удалить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <Text style={styles.title}>История</Text>
      <FlatList
        data={combined}
        keyExtractor={(item) => `${item.kind}_${item.id}`}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.empty}>Пока нет записей</Text>
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f5f7fb' },
  title: { fontSize: 24, fontWeight: '700', color: '#111', paddingHorizontal: 20, paddingTop: 16, marginBottom: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  meal: { borderLeftColor: '#2f6fed' },
  def: { borderLeftColor: '#27ae60' },
  time: { fontSize: 13, color: '#888', width: 120 },
  name: { fontSize: 15, color: '#222' },
  sub: { fontSize: 12, color: '#999', marginTop: 2 },
  delete: { fontSize: 13, color: '#e74c3c', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
});
