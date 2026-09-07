import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { searchFoods, kcalForServing } from '../services/foodApi';
import { addMeal, addDefecation } from '../store/storage';
import { runAchievementCheck } from '../services/achievements';
import { evaluateMealByPhoto, getProvider, setProvider, getApiKey, saveApiKey, caloriesOfResult } from '../services/vision';
import { validateCalories, validatePortionWeight } from '../model/validators.mjs';
import { ScreenHeader, Card, Button, TextField, Icon, DefecationModal } from '../ui';
import { useThemeColors, type, space } from '../theme';
import * as ImagePicker from 'expo-image-picker';

const DEFAULT_GRAMS = 200;

export default function LogScreen() {
  const palette = useThemeColors();
  const route = useRoute();
  const [mode, setMode] = useState('search'); // 'search' | 'photo'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState(String(DEFAULT_GRAMS));

  // Центральный FAB может открыть Лог сразу в нужном под-режиме.
  useEffect(() => {
    const initial = route?.params?.initialMode;
    if (initial === 'photo' || initial === 'search') setMode(initial);
  }, [route?.params?.initialMode]);

  // фото-режим
  const [photoUri, setPhotoUri] = useState(null);
  const [photoCal, setPhotoCal] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [photoResult, setPhotoResult] = useState(null);
  const [defModalVisible, setDefModalVisible] = useState(false);

  // настройки AI
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiProvider, setAiProvider] = useState('mock');
  const [aiHfKey, setAiHfKey] = useState('');
  const [aiOpenaiKey, setAiOpenaiKey] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

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
      setSearched(true);
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
    setSearched(false);
    runAchievementCheck();
    return mealPayload;
  }

  async function onLogSelected() {
    if (!selected) return;
    const g = validatePortionWeight(parseFloat(grams) || DEFAULT_GRAMS);
    const kcal = kcalForServing(selected.kcal100g, g);
    const payload = {
      name: selected.name,
      kcal100g: selected.kcal100g,
      kcal: validateCalories(kcal),
      grams: g,
      source: 'foodfacts',
      imageUrl: selected.imageUrl || null,
    };
    await logMeal(payload);
    Alert.alert('Готово', `Приём добавлен${kcal ? `, ~${kcal} ккал` : ''}`);
  }

  // --- Настройки AI ---
  async function openAiSettings() {
    const [prov, hf, oa] = await Promise.all([getProvider(), getApiKey('huggingface'), getApiKey('openai')]);
    setAiProvider(prov);
    setAiHfKey(hf ? '••••••••••••••••' : '');
    setAiOpenaiKey(oa ? '••••••••••••••••' : '');
    setAiModalVisible(true);
  }

  async function selectAiProvider(id) {
    setAiProvider(id);
    if (id !== 'mock') {
      const key = await getApiKey(id);
      if (!key) {
        Alert.alert('⚠️ Нужен API-ключ', `Для «${id === 'openai' ? 'OpenAI' : 'Hugging Face'}» введите ключ ниже.`);
      }
    }
    await setProvider(id);
  }

  async function onSaveAiKey(which) {
    const key = which === 'openai' ? aiOpenaiKey : aiHfKey;
    if (!key || key.includes('•')) {
      Alert.alert('Пусто', 'Введите корректный ключ.');
      return;
    }
    setAiLoading(true);
    try {
      await saveApiKey(which, key);
      if (which === 'openai') setAiOpenaiKey('••••••••••••••••');
      else setAiHfKey('••••••••••••••••');
      Alert.alert('✅ Сохранено', 'Ключ безопасно сохранён в хранилище устройства.');
    } finally {
      setAiLoading(false);
    }
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
      setPhotoResult(null);
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
    setPhotoResult(null);
    try {
      const res = await evaluateMealByPhoto(photoUri);
      const kcal = caloriesOfResult(res);
      setPhotoResult(res);
      if (kcal != null) setPhotoCal(String(kcal));
      if (res.name && res.provider !== 'mock') setPhotoName(res.name.replace(/[•]+/g, '').trim());
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
    const kcalRaw = parseFloat(photoCal);
    const hasKcal = Number.isFinite(kcalRaw);
    const payload = {
      name: photoName.trim() || (photoResult && photoResult.name) || 'Приём пищи (фото)',
      photoUri,
      kcal: hasKcal ? validateCalories(kcalRaw) : null,
      kcal100g: null,
      grams: null,
      source: 'photo',
    };
    await logMeal(payload);
    setPhotoUri(null);
    setPhotoCal('');
    setPhotoName('');
    setPhotoResult(null);
    Alert.alert('Готово', payload.kcal != null ? `Добавлено, ${payload.kcal} ккал` : 'Добавлено без калорий');
  }

  async function logDefecation(details = {}) {
    await addDefecation({ id: `d_${Date.now()}`, timeMs: Date.now(), ...details });
    const msg =
      details.bristol != null
        ? `Дефекация записана, тип ${details.bristol}${details.comfort != null ? `, комфорт ${details.comfort}/5` : ''}`
        : 'Дефекация записана';
    Alert.alert('Готово', msg);
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
            <Icon name="list" size={17} color={mode === 'search' ? palette.accent : palette.textMuted} />
            <Text style={[styles.modeTabText, { color: mode === 'search' ? palette.accent : palette.textMuted }]}>Поиск</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'photo' && [styles.modeTabActive, { backgroundColor: palette.surface }]]}
            onPress={() => setMode('photo')}
            accessibilityRole="radio"
            accessibilityState={{ selected: mode === 'photo' }}
            accessibilityLabel="Режим своего фото"
          >
            <Icon name="photo" size={17} color={mode === 'photo' ? palette.accent : palette.textMuted} />
            <Text style={[styles.modeTabText, { color: mode === 'photo' ? palette.accent : palette.textMuted }]}>Своё фото</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.swipeHint, { color: palette.textSecondary }]}>Свайп влево/вправо — переключение режимов</Text>

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
                ListHeaderComponent={
                  searching ? (
                    <View style={styles.searchLoading}>
                      <ActivityIndicator color={palette.accent} />
                      <Text style={[styles.searchLoadingText, { color: palette.textSecondary }]}>Ищем блюда…</Text>
                    </View>
                  ) : null
                }
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
                !searching && query.length ? (
                  <Text style={[styles.empty, { color: palette.textMuted }]}>
                    {searched ? 'Ничего не найдено. Попробуйте иначе.' : 'Начните поиск блюда'}
                  </Text>
                ) : null
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

            <TouchableOpacity
              style={[styles.aiRow, { backgroundColor: palette.surfaceAlt }]}
              onPress={openAiSettings}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Настроить AI-анализ фото"
            >
              <Icon name="chat" size={18} color={palette.accent} />
              <Text style={[styles.aiRowText, { color: palette.textPrimary }]}>🤖 Настроить AI-анализ</Text>
              <Icon name="arrowRight" size={16} color={palette.textMuted} />
            </TouchableOpacity>

            {photoUri ? (
              <>
                <Button
                  title={estimating ? 'Оцениваем…' : 'Оценить калории по фото'}
                  icon="energy"
                  loading={estimating}
                  onPress={onEstimate}
                  variant="secondary"
                  style={styles.spacer}
                />

                {photoResult ? (
                  <View style={[styles.aiResult, { backgroundColor: palette.accentSoft, borderColor: palette.border }]}>
                    <View style={styles.aiResultHeader}>
                      <Text style={[styles.aiResultName, { color: palette.textPrimary }]}>{photoResult.name || 'Блюдо'}</Text>
                      {photoResult.calories != null ? (
                        <Text style={[styles.aiResultKcal, { color: palette.accent }]}>{photoResult.calories} ккал</Text>
                      ) : null}
                    </View>
                    {photoResult.description ? (
                      <Text style={[styles.aiResultDesc, { color: palette.textSecondary }]}>{photoResult.description}</Text>
                    ) : null}
                    <Text style={[styles.aiResultMeta, { color: palette.textMuted }]}>
                      Уверенность {Math.round((photoResult.confidence || 0) * 100)}% · провайдер {photoResult.provider}
                      {photoResult.note ? `\n${photoResult.note}` : ''}
                    </Text>
                  </View>
                ) : null}

                <Text style={[styles.photoHint, { color: palette.textMuted }]}>
                  Фото анализируется выбранным AI. Без настройки — демо-оценка.
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
          onPress={() => setDefModalVisible(true)}
          style={styles.spacer}
        />
      </ScrollView>
      <DefecationModal
        visible={defModalVisible}
        onClose={() => setDefModalVisible(false)}
        onSave={(d) => logDefecation(d)}
      />

      <Modal
        visible={aiModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAiModalVisible(false)}
      >
        <Pressable style={styles.aiBackdrop} onPress={() => setAiModalVisible(false)} accessibilityLabel="Закрыть настройки AI" />
        <View pointerEvents="box-none" style={styles.aiModalHost}>
          <View style={[styles.aiModalCard, { backgroundColor: palette.surface }]}>
            <View style={styles.aiModalHeader}>
              <Text style={[styles.aiModalTitle, { color: palette.textPrimary }]}>🤖 AI-анализ фото</Text>
              <TouchableOpacity onPress={() => setAiModalVisible(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Закрыть">
                <Icon name="close" size={20} color={palette.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.aiModalSub, { color: palette.textSecondary }]}>Провайдер для распознавания еды по фото</Text>

            {[
              { id: 'mock', title: '🎭 Демо-режим', desc: 'Случайные значения для тестирования', price: 'Бесплатно', acc: '★☆☆' },
              { id: 'huggingface', title: '🤗 Hugging Face', desc: 'Бесплатный AI, базовое распознавание', price: 'Бесплатно', acc: '★★☆' },
              { id: 'openai', title: '🧠 OpenAI Vision', desc: 'Максимальная точность (платно)', price: '~$0.01/фото', acc: '★★★★★' },
            ].map((p) => {
              const active = aiProvider === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.aiOption, { backgroundColor: palette.surfaceAlt, borderColor: active ? palette.accent : 'transparent' }]}
                  onPress={() => selectAiProvider(p.id)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.aiOptionHeader}>
                      <Text style={[styles.aiOptionTitle, { color: palette.textPrimary }]}>{p.title}</Text>
                      {active ? <Text style={[styles.aiOptionActive, { color: palette.accent }]}>✓ Активен</Text> : null}
                    </View>
                    <Text style={[styles.aiOptionDesc, { color: palette.textSecondary }]}>{p.desc}</Text>
                    <Text style={[styles.aiOptionMeta, { color: palette.textMuted }]}>{p.price} · {p.acc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.aiKeysTitle, { color: palette.textPrimary }]}>🔑 API-ключи</Text>

            <TextField
              label="Hugging Face Token"
              placeholder="hf_xxxxxxxxxxxx"
              value={aiHfKey}
              onChangeText={setAiHfKey}
              secureTextEntry={false}
              autoCapitalize="none"
              style={styles.aiKeyField}
            />
            <Button title="Сохранить HF-ключ" icon="check" variant="secondary" loading={aiLoading} onPress={() => onSaveAiKey('huggingface')} style={styles.spacer} />

            <TextField
              label="OpenAI API Key"
              placeholder="sk-xxxxxxxxxxxx"
              value={aiOpenaiKey}
              onChangeText={setAiOpenaiKey}
              secureTextEntry={false}
              autoCapitalize="none"
              style={styles.aiKeyField}
            />
            <Button title="Сохранить OpenAI-ключ" icon="check" variant="secondary" loading={aiLoading} onPress={() => onSaveAiKey('openai')} style={styles.spacer} />
          </View>
        </View>
      </Modal>
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
  searchLoading: { alignItems: 'center', paddingVertical: 16 },
  searchLoadingText: { marginTop: 8, fontSize: type.label },
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
  photoHint: { fontSize: type.caption, textAlign: 'center', marginTop: 8, lineHeight: 18 },

  aiRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: space.sm },
  aiRowText: { flex: 1, fontSize: 14, fontWeight: type.semibold, marginLeft: 8 },
  aiResult: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: space.md },
  aiResultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  aiResultName: { fontSize: 16, fontWeight: type.semibold, flex: 1 },
  aiResultKcal: { fontSize: 16, fontWeight: type.heavy, marginLeft: 10 },
  aiResultDesc: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  aiResultMeta: { fontSize: 12, lineHeight: 16, marginTop: 8 },

  aiBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.42)' },
  aiModalHost: { position: 'absolute', right: 0, left: 0, bottom: 0 },
  aiModalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: space.xl,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  aiModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiModalTitle: { fontSize: 18, fontWeight: type.heavy },
  aiModalSub: { fontSize: type.caption, marginTop: 2, marginBottom: space.md },
  aiOption: { borderRadius: 12, borderWidth: 1.5, padding: 12, marginBottom: space.sm },
  aiOptionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiOptionTitle: { fontSize: 15, fontWeight: type.semibold },
  aiOptionActive: { fontSize: 12, fontWeight: type.semibold },
  aiOptionDesc: { fontSize: 13, marginTop: 4 },
  aiOptionMeta: { fontSize: 12, marginTop: 4 },
  aiKeysTitle: { fontSize: 16, fontWeight: type.semibold, marginTop: space.md, marginBottom: space.md },
  aiKeyField: { marginTop: space.md },

  spacer: { marginTop: space.md },
});
