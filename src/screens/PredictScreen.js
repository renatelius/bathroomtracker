import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { predict } from '../model/model.mjs';
import { getProfile, getDefecations, getMeals } from '../store/storage';
import { schedulePrediction, cancelPrediction, ensurePermissions } from '../services/notifications';

const DAY = 24 * 3600e3;

function fmtTime(ms) {
  const d = new Date(ms);
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

export default function PredictScreen() {
  const [prediction, setPrediction] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const profile = await getProfile();
    const defecations = await getDefecations();
    const meals = await getMeals();
    const p = predict({ defecations, meals, profile, nowMs: Date.now() });
    setPrediction(p);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function onSetAlarm() {
    setBusy(true);
    try {
      const { granted } = await ensurePermissions();
      if (!granted) {
        Alert.alert(
          'Нет доступа к уведомлениям',
          'Разрешите уведомления в настройках, чтобы будильник работал.'
        );
        return;
      }
      const when = new Date(prediction.predictedAtMs);
      await cancelPrediction();
      await schedulePrediction({
        timeMs: prediction.predictedAtMs,
        title: 'Прогноз дефекации',
        body: `По расчётам — примерно ${when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}.`,
      });
      Alert.alert('Готово', `Напоминание на ${when.toLocaleDateString('ru-RU')} ~${when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}.`);
    } catch (e) {
      Alert.alert('Ошибка', e.message || 'Не удалось установить напоминание');
    } finally {
      setBusy(false);
    }
  }

  if (!prediction) {
    return (
      <SafeAreaView style={styles.flex}>
        <Text style={styles.loading}>Загрузка…</Text>
      </SafeAreaView>
    );
  }

  const main = fmtTime(prediction.predictedAtMs);
  const low = fmtTime(prediction.lowMs);
  const high = fmtTime(prediction.highMs);

  const sourceLabel =
    prediction.source === 'history'
      ? 'на основе вашей истории'
      : prediction.source === 'median'
        ? 'на основе небольшой истории'
        : 'физиологический дефолт (пока мало данных)';

  // Сдвиг интервала на относительную шкалу "через X"
  const inHours = prediction.intervalH;
  const shiftText =
    inHours < 24
      ? `через ~${Math.round(inHours)} ч`
      : `через ~${(inHours / 24).toFixed(1)} дня`;

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.container}
      >
        <Text style={styles.title}>Прогноз</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Следующая дефекация вероятнее всего</Text>
          <Text style={styles.bigDate}>{main.date}</Text>
          <Text style={styles.bigTime}>~{main.time}</Text>
          <Text style={styles.shift}>{shiftText}</Text>
          <Text style={styles.source}>Метод: {sourceLabel}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Окно достоверности</Text>
          <Text style={styles.windowText}>
            {low.date}{' '}{low.time} — {high.date}{' '}{high.time}
          </Text>
          <Text style={styles.confidence}>± ~{prediction.confidenceH} ч</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Факторы модели</Text>
          {[
            { key: 'base', label: 'Базовый интервал (история)', value: prediction.factors.base, unit: 'ч' },
            { key: 'body', label: 'Тело (пол/ИМТ/возраст)', value: prediction.factors.body, unit: '×' },
            { key: 'food', label: 'Еда (последние 48 ч)', value: prediction.factors.food, unit: '×' },
            { key: 'rhythm', label: 'Суточный ритм', value: prediction.factors.rhythm, unit: '×' },
          ].map((f) => (
            <View key={f.key} style={styles.factorRow}>
              <Text style={styles.factorLabel}>{f.label}</Text>
              <Text style={styles.factorValue}>
                {f.value}{f.unit}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.alarmBtn, busy && { opacity: 0.6 }]}
          disabled={busy}
          onPress={onSetAlarm}
        >
          <Text style={styles.alarmBtnText}>🔔 Поставить напоминание</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f5f7fb' },
  container: { padding: 20, paddingTop: 16 },
  loading: { textAlign: 'center', marginTop: 60, color: '#999' },
  title: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
  },
  cardLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  bigDate: { fontSize: 20, fontWeight: '700', color: '#111', textTransform: 'capitalize' },
  bigTime: { fontSize: 30, fontWeight: '800', color: '#2f6fed', marginTop: 4 },
  shift: { fontSize: 14, color: '#333', marginTop: 8 },
  source: { fontSize: 12, color: '#999', marginTop: 8 },
  windowText: { fontSize: 16, color: '#222', lineHeight: 22 },
  confidence: { fontSize: 13, color: '#2f6fed', marginTop: 6 },
  factorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  factorLabel: { fontSize: 14, color: '#555', flex: 1, paddingRight: 12 },
  factorValue: { fontSize: 14, fontWeight: '600', color: '#2f6fed' },
  alarmBtn: {
    backgroundColor: '#2f6fed',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  alarmBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
