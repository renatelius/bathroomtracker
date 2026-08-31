import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { predict } from '../model/model.mjs';
import { getProfile, getDefecations, getMeals, getSettings } from '../store/storage';
import { schedulePrediction, cancelPrediction, ensurePermissions } from '../services/notifications';
import { ScreenHeader, Card, Button, Section, Icon, FadeIn } from '../ui';
import { useThemeColors, type, space } from '../theme';

const DAY = 24 * 3600e3;

function fmtTime(ms, locale) {
  const d = new Date(ms);
  const date = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', weekday: 'long' });
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

export default function PredictScreen() {
  const palette = useThemeColors();
  const [prediction, setPrediction] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locale, setLocale] = useState('ru-RU');
  const [lead, setLead] = useState(15);

  const load = useCallback(async () => {
    const profile = await getProfile();
    const defecations = await getDefecations();
    const meals = await getMeals();
    const settings = await getSettings();
    const p = predict({ defecations, meals, profile, nowMs: Date.now() });
    setPrediction(p);
    setLead(settings.alarmLeadMinutes);
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
        predictedAtMs: prediction.predictedAtMs,
        leadMinutes: lead,
        title: 'Прогноз дефекации',
        body: `По расчётам — примерно ${when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}.`,
      });
      Alert.alert(
        'Готово',
        `Напоминание за ${lead} мин. на ${when.toLocaleDateString('ru-RU')} ~${when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}.`
      );
    } catch (e) {
      Alert.alert('Ошибка', e.message || 'Не удалось установить напоминание');
    } finally {
      setBusy(false);
    }
  }

  if (!prediction) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
        <Text style={[styles.loading, { color: palette.textMuted }]}>Загрузка…</Text>
      </SafeAreaView>
    );
  }

  const main = fmtTime(prediction.predictedAtMs, locale);
  const low = fmtTime(prediction.lowMs, locale);
  const high = fmtTime(prediction.highMs, locale);

  const sourceLabel =
    prediction.source === 'history'
      ? 'на основе вашей истории'
      : prediction.source === 'median'
        ? 'на основе небольшой истории'
        : 'физиологический дефолт (пока мало данных)';

  const inHours = prediction.intervalH;
  const shiftText =
    inHours < 24
      ? `через ~${Math.round(inHours)} ч`
      : `через ~${(inHours / 24).toFixed(1)} дня`;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.container}
      >
        <ScreenHeader title="Прогноз" subtitle="Следующая дефекация" icon="forecast" />

        <FadeIn>
          <Card
            tone="accent"
            accessible
            accessibilityLabel={`Следующая дефекация вероятнее всего ${main.date} примерно в ${main.time} (${shiftText}). ${sourceLabel}`}
          >
            <Text style={[styles.accentLabel, { color: palette.accentSoft }]}>
              Следующая дефекация вероятнее всего
            </Text>
          <Text style={[styles.accentDate, { color: palette.textOnAccent }]}>{main.date}</Text>
          <View style={styles.accentTimeRow}>
            <Text style={[styles.accentTime, { color: palette.textOnAccent }]}>~{main.time}</Text>
            <Text style={[styles.shift, { color: palette.accentSoft }]}>{shiftText}</Text>
          </View>
            <View style={styles.sourceRow}>
              <Icon name="forecast" size={15} color={palette.accentSoft} />
              <Text style={[styles.source, { color: palette.accentSoft }]}>Метод: {sourceLabel}</Text>
            </View>
          </Card>
        </FadeIn>

        <Section title="Окно достоверности" />
        <Card tone="default" style={styles.compactCard}>
          <View style={styles.windowRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.windowCap, { color: palette.textSecondary }]}>{low.date}</Text>
              <Text style={[styles.windowTime, { color: palette.forecastLow }]}>~{low.time}</Text>
            </View>
            <Text style={[styles.windowDash, { color: palette.textMuted }]}>—</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.windowCap, { color: palette.textSecondary }]}>{high.date}</Text>
              <Text style={[styles.windowTime, { color: palette.forecastMid }]}>~{high.time}</Text>
            </View>
          </View>
          <Text style={[styles.confidence, { color: palette.accent }]}>± ~{prediction.confidenceH} ч</Text>
        </Card>

        <Section title="Что на это влияет" />
        <Card tone="default">
          {[
            { key: 'base', label: 'Ваш ритм (история)', value: prediction.factors.base, unit: ' ч' },
            { key: 'body', label: 'Тело', value: prediction.factors.body, unit: '×' },
            { key: 'food', label: 'Еда (последние 48 ч)', value: prediction.factors.food, unit: '×' },
            { key: 'rhythm', label: 'Суточный ритм', value: prediction.factors.rhythm, unit: '×' },
          ].map((f) => (
            <View key={f.key} style={[styles.factorRow, { borderBottomColor: palette.divider }]}>
              <Text style={[styles.factorLabel, { color: palette.textPrimary }]}>{f.label}</Text>
              <View style={[styles.factorPill, { backgroundColor: palette.accentSoft }]}>
                <Text style={[styles.factorValue, { color: palette.accent }]}>
                  {f.value}{f.unit}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        <Button
          title={busy ? 'Устанавливаем…' : `🔔 Напомнить за ${lead} мин.`}
          icon="alarm"
          loading={busy}
          onPress={onSetAlarm}
          style={styles.spacer}
        />
        <Text style={[styles.hint, { color: palette.textMuted }]}>
          Напоминание: указано в настройках. Время звонка — перед прогнозом.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: space.xl, paddingTop: 16 },
  loading: { textAlign: 'center', marginTop: 60 },

  // accent card
  accentLabel: { fontSize: type.label, fontWeight: type.medium, marginBottom: 8 },
  accentDate: {
    fontSize: 21,
    fontWeight: type.heavy,
    textTransform: 'capitalize',
  },
  accentTimeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  accentTime: { fontSize: 32, fontWeight: type.heavy },
  shift: { fontSize: type.body, fontWeight: type.semibold, marginLeft: 12 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  source: { fontSize: 12, marginLeft: 6 },

  // window card
  compactCard: { paddingTop: 14, paddingBottom: 14 },
  windowRow: { flexDirection: 'row', alignItems: 'center' },
  windowCap: { fontSize: 13 },
  windowTime: { fontSize: 19, fontWeight: type.semibold, marginTop: 2 },
  windowDash: { marginHorizontal: 10, fontSize: 18 },
  confidence: { textAlign: 'center', marginTop: 12, fontWeight: type.semibold },

  // factors
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  factorLabel: { fontSize: type.body, flex: 1, paddingRight: 12 },
  factorPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  factorValue: { fontSize: 14, fontWeight: type.semibold },

  spacer: { marginTop: space.md, marginBottom: space.sm },
  hint: { fontSize: type.caption, textAlign: 'center', marginBottom: 20 },
});
