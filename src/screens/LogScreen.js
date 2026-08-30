import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchFoods, kcalForServing } from '../services/foodApi';
import { addMeal, addDefecation } from '../store/storage';
import { evaluateMealByPhoto } from '../services/vision';
import { ScreenHeader, Card, Button, TextField, Icon } from '../ui';
import { palette, type, space } from '../theme';
import * as ImagePicker from 'expo-image-picker';

const DEFAULT_GRAMS = 200;

export default function LogScreen() {
  const [mode, setMode] = useState('search'); // 'search' | 'photo'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState(String(DEFAULT_GRAMS));

  // фото-режим
  const [photoUri, setPhotoUri] = useState(null);
  const [photoCal, setPhotoCal] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [estimating, setEstimating] = useState(false);

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

  async function logMeal(mealPayload) {
    await addMeal({ id: `m_${Date.now()}`, timeMs: Date.now(), ...mealPayload });
    setSelected(null);
    setResults([]);
    setQuery('');
    return mealPayload;
  }

  async function onLogSelected() {
    if (!selected) return;
    const g = parseFloat(grams) || DEFAULT_GRAMS;
    const kcal = kcalForServing(selected.kcal100g, g);
    const payload = {
      name: selected.name,
      kcal100g: selected.kcal100g,
      kcal,
      grams: g,
      source: 'foodfacts',
      imageUrl: selected.imageUrl || null,
    };
    await logMeal(payload);
    Alert.alert('Готово', `Приём добавлен${kcal ? `, ~${kcal} ккал` : ''}`);
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    // даём выбрать из галереи (галерея не требует камеру)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoCal('');
      setPhotoName('');
    }
  }

  async function onPickPhoto() {
    try {
      await pickPhoto();
    } catch (e) {
      Alert.alert('Ошибка', e.message || 'Не удалось открыть галерею');
    }
  }

  async function onEstimate() {
    if (!photoUri) return;
    setEstimating(true);
    try {
      const res = await evaluateMealByPhoto(photoUri);
      setPhotoCal(String(res.calories != null ? res.calories : ''));
      if (res.note) {
        Alert.alert('Оценка', `Примерно ${res.calories} ккал. ${res.note}`);
      }
    } catch (e) {
      Alert.alert('Ошибка', e.message || 'Не удалось оценить');
    } finally {
      setEstimating(false);
    }
  }

  async function onLogPhoto() {
    if (!photoUri) {
      Alert.alert('Нет фото', 'Сначала выберите фото приёма пищи.');
      return;
    }
    const kcal = parseFloat(photoCal);
    const payload = {
      name: photoName.trim() || 'Приём пищи (фото)',
      photoUri,
      kcal: Number.isFinite(kcal) ? kcal : null,
      kcal100g: null,
      grams: Number.isFinite(kcal) ? null : null,
      source: 'photo',
    };
    await logMeal(payload);
    setPhotoUri(null);
    setPhotoCal('');
    setPhotoName('');
    Alert.alert('Готово', payload.kcal != null ? `Добавлено, ${payload.kcal} ккал` : 'Добавлено без калорий');
  }

  async function logDefecation() {
    await addDefecation({ id: `d_${Date.now()}`, timeMs: Date.now() });
    Alert.alert('Готово', 'Дефекация записана');
  }

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Что съели?" subtitle="Добавить приём пищи или дефекацию" icon="food" />

        {/* Переключатель режима */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'search' && styles.modeTabActive]}
            onPress={() => setMode('search')}
          >
            <Icon name="list" size={16} color={mode === 'search' ? palette.accent : palette.textMuted} />
            <Text style={[styles.modeTabText, mode === 'search' && { color: palette.accent }]}>Поиск</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'photo' && styles.modeTabActive]}
            onPress={() => setMode('photo')}
          >
            <Icon name="photo" size={16} color={mode === 'photo' ? palette.accent : palette.textMuted} />
            <Text style={[styles.modeTabText, mode === 'photo' && { color: palette.accent }]}>Своё фото</Text>
          </TouchableOpacity>
        </View>

        {mode === 'search' ? (
          <>
            <View style={styles.searchRow}>
              <View style={{ flex: 1 }}>
                <TextField
                  placeholder="Поиск блюда (например, гречка)"
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={onSearch}
                  returnKeyType="search"
                  inputStyle={styles.searchInput}
                />
              </View>
              <TouchableOpacity style={styles.searchBtn} onPress={onSearch}>
                {searching ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchBtnText}>Найти</Text>}
              </TouchableOpacity>
            </View>

            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const active = selected && selected.id === item.id;
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.food, active && styles.foodActive]}
                    onPress={() => setSelected(item)}
                  >
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.foodThumb} />
                    ) : (
                      <View style={[styles.foodThumb, styles.foodThumbEmpty]}>
                        <Icon name="food" size={18} color={palette.textMuted} />
                      </View>
                    )}
                    <View style={{ flex: 1, paddingHorizontal: 12 }}>
                      <Text style={styles.foodName} numberOfLines={2}>{item.name}</Text>
                      {item.brand ? <Text style={styles.foodBrand}>{item.brand}</Text> : null}
                    </View>
                    <Text style={styles.foodKcal}>
                      {item.kcal100g != null ? `${Math.round(item.kcal100g)} ккал/100г` : '—'}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                !searching && query.length ? <Text style={styles.empty}>Начните поиск блюда</Text> : null
              }
            />

            {selected ? (
              <Card style={styles.panelCard}>
                <Text style={styles.panelName} numberOfLines={1}>{selected.name}</Text>
                <View style={styles.gramsRow}>
                  <Text style={styles.panelLabel}>Вес порции, г</Text>
                  <TextField
                    keyboardType="numeric"
                    value={grams}
                    onChangeText={setGrams}
                    inputStyle={styles.gramsInput}
                    style={styles.gramsField}
                  />
                </View>
                <Button title="+ Добавить приём пищи" icon="plus" onPress={onLogSelected} />
              </Card>
            ) : null}
          </>
        ) : (
          <Card>
            <TouchableOpacity style={styles.photoDrop} onPress={onPickPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoEmpty}>
                  <Icon name="photo" size={32} color={palette.accent} />
                  <Text style={styles.photoEmptyText}>Выберите фото приёма пищи</Text>
                </View>
              )}
            </TouchableOpacity>

            {photoUri ? (
              <>
                <Button
                  title={estimating ? 'Оцениваем…' : '✨ Оценить калории по фото'}
                  icon="energy"
                  loading={estimating}
                  onPress={onEstimate}
                  variant="secondary"
                  style={styles.spacer}
                />
                <TextField
                  label="Название (необязательно)"
                  value={photoName}
                  onChangeText={setPhotoName}
                  placeholder="Например, обед"
                  style={styles.spacer}
                />
                <TextField
                  label="Калории, ккал (впишите или оцените)"
                  keyboardType="numeric"
                  value={photoCal}
                  onChangeText={setPhotoCal}
                  placeholder="Например, 450"
                />
                <Button title="+ Добавить приём пищи" icon="plus" onPress={onLogPhoto} style={styles.spacer} />
              </>
            ) : null}
          </Card>
        )}

        <Button
          title="+ Дефекация сейчас"
          icon="check"
          variant="ghost"
          onPress={logDefecation}
          style={styles.spacer}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.bg },
  container: { padding: space.xl, paddingTop: 16 },
  modeRow: { flexDirection: 'row', backgroundColor: palette.surfaceAlt, borderRadius: 14, padding: 4, marginBottom: space.lg },
  modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 11 },
  modeTabActive: { backgroundColor: palette.surface },
  modeTabText: { marginLeft: 6, fontSize: type.body, fontWeight: type.semibold, color: palette.textMuted },

  searchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  searchInput: { backgroundColor: palette.surface },
  searchBtn: { backgroundColor: palette.accent, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '600' },

  food: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    marginBottom: space.sm,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  foodActive: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
  foodThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: palette.surfaceAlt },
  foodThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  foodName: { fontSize: 15, color: palette.textPrimary },
  foodBrand: { fontSize: 12, color: palette.textMuted, marginTop: 2 },
  foodKcal: { fontSize: 13, color: palette.accent, fontWeight: type.semibold, marginLeft: 8 },
  empty: { textAlign: 'center', color: palette.textMuted, marginTop: 24 },

  panelCard: { marginTop: space.sm },
  panelName: { fontSize: 16, fontWeight: type.semibold, color: palette.textPrimary, marginBottom: space.md },
  gramsRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: space.md },
  panelLabel: { fontSize: 14, color: palette.textSecondary, marginRight: 12 },
  gramsField: { flex: 1 },
  gramsInput: { textAlign: 'center', backgroundColor: palette.surfaceAlt },

  photoDrop: { borderRadius: 14, overflow: 'hidden', backgroundColor: palette.surfaceAlt, borderWidth: 1, borderColor: palette.border },
  photoPreview: { width: '100%', height: 180, resizeMode: 'cover' },
  photoEmpty: { height: 150, alignItems: 'center', justifyContent: 'center' },
  photoEmptyText: { marginTop: 8, color: palette.textMuted, fontSize: type.body },

  spacer: { marginTop: space.md },
});
