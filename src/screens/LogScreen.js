import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchFoods, kcalForServing } from '../services/foodApi';
import { addMeal, addDefecation, getMeals } from '../store/storage';

const DEFAULT_GRAMS = 200;

export default function LogScreen({ route }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState(String(DEFAULT_GRAMS));

  const onSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const foods = await searchFoods(query, 20);
      setResults(foods);
      setSelected(null);
    } catch (e) {
      Alert.alert('Ошибка', e.message || 'Не удалось найти еду');
    } finally {
      setSearching(false);
    }
  }, [query]);

  async function logMeal() {
    if (!selected) return;
    const g = parseFloat(grams) || DEFAULT_GRAMS;
    const kcal = kcalForServing(selected.kcal100g, g);
    await addMeal({
      id: `m_${Date.now()}`,
      name: selected.name,
      kcal100g: selected.kcal100g,
      kcal: kcal,
      grams: g,
      timeMs: Date.now(),
    });
    setSelected(null);
    setResults([]);
    setQuery('');
    Alert.alert('Готово', `Приём добавлен${kcal ? `, ~${kcal} ккал` : ''}`);
  }

  async function logDefecation() {
    await addDefecation({
      id: `d_${Date.now()}`,
      timeMs: Date.now(),
    });
    Alert.alert('Готово', 'Дефекация записана');
  }

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Что съели?</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск блюда (например, гречка)"
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={onSearch}>
          {searching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchBtnText}>Найти</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const active = selected && selected.id === item.id;
          return (
            <TouchableOpacity
              style={[styles.food, active && styles.foodActive]}
              onPress={() => setSelected(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.foodName} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.brand ? (
                  <Text style={styles.foodBrand}>{item.brand}</Text>
                ) : null}
              </View>
              <Text style={styles.foodKcal}>
                {item.kcal100g != null ? `${Math.round(item.kcal100g)} ккал/100г` : '—'}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !searching && query.length ? (
            <Text style={styles.empty}>Начните поиск блюда</Text>
          ) : null
        }
      />

      {selected ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle} numberOfLines={1}>
            {selected.name}
          </Text>
          <View style={styles.gramsRow}>
            <Text style={styles.panelLabel}>Вес порции, г</Text>
            <TextInput
              style={styles.gramsInput}
              keyboardType="numeric"
              value={grams}
              onChangeText={setGrams}
            />
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={logMeal}>
            <Text style={styles.primaryBtnText}>+ Добавить приём пищи</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={logDefecation}>
            <Text style={styles.secondaryBtnText}>+ Дефекация сейчас</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.defBtn} onPress={logDefecation}>
          <Text style={styles.secondaryBtnText}>+ Дефекация сейчас</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f5f7fb' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#111' },
  searchRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  searchBtn: {
    backgroundColor: '#2f6fed',
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '600' },
  food: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 4,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  foodActive: { borderColor: '#2f6fed', backgroundColor: '#eaf1ff' },
  foodName: { fontSize: 15, color: '#222' },
  foodBrand: { fontSize: 12, color: '#999', marginTop: 2 },
  foodKcal: { fontSize: 13, color: '#2f6fed', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#999', marginTop: 30 },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  panelTitle: { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 10 },
  gramsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  panelLabel: { fontSize: 14, color: '#555' },
  gramsInput: {
    backgroundColor: '#f2f4f8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 80,
    textAlign: 'center',
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: '#2f6fed',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  secondaryBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2f6fed',
  },
  secondaryBtnText: { color: '#2f6fed', fontWeight: '600', fontSize: 15 },
  defBtn: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2f6fed',
  },
});
