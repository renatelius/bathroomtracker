import React, { useState, useCallback, useRef } from 'react';
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
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchFoods, kcalForServing } from '../services/foodApi';
import { addMeal, addDefecation } from '../store/storage';
import { evaluateMealByPhoto } from '../services/vision';
import { ScreenHeader, Card, Button, TextField, Icon } from '../ui';
import { useThemeColors, type, space } from '../theme';
import * as ImagePicker from 'expo-image-picker';

const DEFAULT_GRAMS = 200;

export default function LogScreen() {
  const palette = useThemeColors();
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

  // Свайп между под-режимами «Поиск» / «Своё фото»
  const panX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderMove: (_, g) => {
        panX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > 64) {
          setMode((m) => (m === 'search' ? 'photo' : 'search'));
        }
        Animated.spring(panX, { toValue: 0, useNativeDriver: true, speed: 24, bounciness: 0 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

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
      quality: 0.5,
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
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Что съели?" subtitle="Добавить приём пищи или дефекацию" icon="food" />

        {/* Переключатель режима */}
        <View style={[styles.modeRow, { backgroundColor: palette.surfaceAlt }]}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'search' && [styles.modeTabActive, { backgroundColor: palette.surface }]]}
            onPress={() => setMode('search')}
            accessibilityRole="radio"
            accessibilityState={{ selected: mode === 'search' }}
            accessibilityLabel="Режим поиска"
          >
            <Icon name="list" size={16} color={mode === 'search' ? palette.accent : palette.textMuted} />
            <Text style={[styles.modeTabText, { color: mode === 'search' ? palette.accent : palette.textMuted }]}>Поиск</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'photo' && [styles.modeTabActive, { backgroundColor: palette.surface }]]}
            onPress={() => setMode('photo')}
            accessibilityRole="radio"
            accessibilityState={{ selected: mode === 'photo' }}
            accessibilityLabel="Режим своего фото"
          >
            <Icon name="photo" size={16} color={mode === 'photo' ? palette.accent : palette.textMuted} />
            <Text style={[styles.modeTabText, { color: mode === 'photo' ? palette.accent : palette.textMuted }]}>Своё фото</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.swipeHint, { color: palette.textMuted }]}>Свайп влево/вправо — переключение режимов</Text>

        <Animated.View
          style={[styles.modeWrap, { transform: [{ translateX: panX }] }]}
          {...panResponder.panHandlers}
        >
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
                  inputStyle={[styles.searchInput, { backgroundColor: palette.surface }]}
                />
              </View>
              <TouchableOpacity style={[styles.searchBtn, { backgroundColor: palette.accent }]} onPress={onSearch} accessibilityRole="button" accessibilityLabel="Найти блюдо">
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
                    style={[styles.food, { backgroundColor: palette.surface, borderColor: palette.border }, active && { borderColor: palette.accent, backgroundColor: palette.accentSoft }]}
                    onPress={() => setSelected(item)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${item.name}${item.kcal100g != null ? `, ${Math.round(item.kcal100g)} килокалорий на 100 грамм` : ''}`}
                  >
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={[styles.foodThumb, { backgroundColor: palette.surfaceAlt }]} />
                    ) : (
                      <View style={[styles.foodThumb, styles.foodThumbEmpty, { backgroundColor: palette.surfaceAlt }]}>
                        <Icon name="food" size={18} color={palette.textMuted} />
                      </View>
                    )}
                    <View style={{ flex: 1, paddingHorizontal: 12 }}>
                      <Text style={[styles.foodName, { color: palette.textPrimary }]} numberOfLines={2}>{item.name}</Text>
                      {item.brand ? <Text style={[styles.foodBrand, { color: palette.textMuted }]}>{item.brand}</Text> : null}
                    </View>
                    <Text style={[styles.foodKcal, { color: palette.accent }]}>
                      {item.kcal100g != null ? `${Math.round(item.kcal100g)} ккал/100г` : '—'}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                !searching && query.length ? <Text style={[styles.empty, { color: palette.textMuted }]}>Начните поиск блюда</Text> : null
              }
            />

            {selected ? (
              <Card style={styles.panelCard}>
                <Text style={[styles.panelName, { color: palette.textPrimary }]} numberOfLines={1}>{selected.name}</Text>
                <View style={styles.gramsRow}>
                  <Text style={[styles.panelLabel, { color: palette.textSecondary }]}>Вес порции, г</Text>
                  <TextField
                    keyboardType="numeric"
                    value={grams}
                    onChangeText={setGrams}
                    inputStyle={[styles.gramsInput, { backgroundColor: palette.surfaceAlt }]}
                    style={styles.gramsField}
                  />
                </View>
                <Button title="+ Добавить приём пищи" icon="plus" onPress={onLogSelected} />
              </Card>
            ) : null}
          </>
        ) : (
          <Card>
            <TouchableOpacity style={[styles.photoDrop, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]} onPress={onPickPhoto} accessibilityRole="button" accessibilityLabel="Выбрать фото приёма пищи">
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoEmpty}>
                  <Icon name="photo" size={32} color={palette.accent} />
                  <Text style={[styles.photoEmptyText, { color: palette.textMuted }]}>Выберите фото приёма пищи</Text>
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
                <Text style={[styles.photoHint, { color: palette.textMuted }]}>
                  Оценка по фото — демо-режим. Для точности подключите реальный распознаватель.
                </Text>
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
        </Animated.View>

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
  flex: { flex: 1 },
  container: { padding: space.xl, paddingTop: 16 },
  modeRow: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: space.sm },
  modeWrap: { marginBottom: space.sm },
  swipeHint: { fontSize: type.caption, textAlign: 'center', marginBottom: space.lg },
  modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 11, minHeight: 44 },
  modeTabActive: {},
  modeTabText: { marginLeft: 6, fontSize: type.body, fontWeight: type.semibold },

  searchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  searchInput: {},
  searchBtn: { borderRadius: 12, paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '600' },

  food: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.sm,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  foodActive: {},
  foodThumb: { width: 44, height: 44, borderRadius: 10 },
  foodThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  foodName: { fontSize: 15 },
  foodBrand: { fontSize: 12, marginTop: 2 },
  foodKcal: { fontSize: 13, fontWeight: type.semibold, marginLeft: 8 },
  empty: { textAlign: 'center', marginTop: 24 },

  panelCard: { marginTop: space.sm },
  panelName: { fontSize: 16, fontWeight: type.semibold, marginBottom: space.md },
  gramsRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: space.md },
  panelLabel: { fontSize: 14, marginRight: 12 },
  gramsField: { flex: 1 },
  gramsInput: { textAlign: 'center' },

  photoDrop: { borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  photoPreview: { width: '100%', height: 180, resizeMode: 'cover' },
  photoEmpty: { height: 150, alignItems: 'center', justifyContent: 'center' },
  photoEmptyText: { marginTop: 8, fontSize: type.body },
  photoHint: { fontSize: type.caption, textAlign: 'center', marginTop: 8, lineHeight: 16 },

  spacer: { marginTop: space.md },
});
