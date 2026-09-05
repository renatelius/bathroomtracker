import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { predict } from '../model/model.mjs';
import { computeStats, computeMilestones } from '../model/progression.mjs';
import { getProfile, getDefecations, getMeals, getSettings, addDefecation } from '../store/storage';
import { schedulePrediction, cancelPrediction, ensurePermissions } from '../services/notifications';
import { ScreenHeader, Card, Button, Section, Icon, FadeIn, ProgressionCard } from '../ui';
import { useThemeColors, type, space, radius, shadow } from '../theme';

const DAY = 24 * 3600e3;

function fmtTime(ms, locale) {
  const d = new Date(ms);
  const date = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', weekday: 'long' });
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

export default function PredictScreen() {
  const palette = useThemeColors();
  const navigation = useNavigation();
  const [prediction, setPrediction] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locale, setLocale] = useState('ru-RU');
  const [lead, setLead] = useState(15);
  const [defecations, setDefecations] = useState([]);
  const [justLogged, setJustLogged] = useState(false);

  const progStats = useMemo(() => computeStats(defecations), [defecations]);
  const milestones = useMemo(() => computeMilestones(defecations), [defecations]);

  const load = useCallback(async () => {
    const profile = await getProfile();
    const defecations = await getDefecations();
    const meals = await getMeals();
    const settings = await getSettings();
    const p = predict({ defecations, meals, profile, nowMs: Date.now() });
    setPrediction(p);
    setDefecations(defecations);
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

  async function onQuickDefecation() {
    await addDefecation({ id: `d_${Date.now()}`, timeMs: Date.now() });
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 1800);
    await load();
  }

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
        <ScrollView contentContainerStyle={styles.container}>
          <ScreenHeader title="Прогноз" subtitle="Следующая дефекация" icon="forecast" />

          <FadeIn>
            <View style={[styles.emptyBox, { backgroundColor: palette.surface, ...shadow.card }]}>
              <View style={[styles.emptyIcon, { backgroundColor: palette.accentSoft }]}>
                <Icon name="forecast" size={32} color={palette.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>
                Пока нет достаточных данных
              </Text>
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                Добавьте первую запись — прогноз появится после пары дней наблюдений.
              </Text>
              <Button
                title={justLogged ? 'Отмечено' : 'Записать дефекацию'}
                icon={justLogged ? 'check' : 'check'}
                onPress={onQuickDefecation}
                style={styles.emptyCta}
              />
              <Button
                title="Добавить приём пищи"
                icon="food"
                variant="secondary"
                onPress={() => navigation.navigate('Лог', { initialMode: 'search' })}
              />
            </View>
          </FadeIn>
        </ScrollView>
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

  // Бар уверенности: контекст = ±2×confidenceH вокруг прогноза.
  const windowMs = prediction.highMs - prediction.lowMs;
  const rangeMs = windowMs * 2 || 1;
  const lowPct = (prediction.lowMs - (prediction.predictedAtMs - rangeMs / 2)) / rangeMs;
  const fillPct = Math.max(0, Math.min(100, (windowMs / rangeMs) * 100));
  const predPct = 50;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.container}
      >
        <ScreenHeader title="Прогноз" subtitle="Следующая дефекация" icon="forecast" />

        <FadeIn>
          <View
            style={[styles.hero, { borderRadius: radius.md, ...shadow.accent }]}
            accessible
            accessibilityLabel={`Следующая дефекация вероятнее всего ${main.date} примерно в ${main.time} (${shiftText}). ${sourceLabel}`}
          >
            <LinearGradient
              colors={[palette.accentDark, palette.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.accentLabel, { color: palette.textOnAccent }]}>
              Следующая дефекация вероятнее всего
            </Text>
            <Text style={[styles.accentDate, { color: palette.textOnAccent }]}>{main.date}</Text>
            <View style={styles.accentTimeRow}>
              <Text style={[styles.accentTime, { color: palette.textOnAccent }]}>~{main.time}</Text>
              <View style={[styles.shiftChip, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Text style={[styles.shift, { color: palette.textOnAccent }]}>{shiftText}</Text>
              </View>
            </View>

            {/* Мини-бар окна достоверности */}
            <View
              style={styles.barArea}
              accessible
              accessibilityLabel={`Окно достоверности: с ${low.date} ${low.time} до ${high.date} ${high.time}, погрешность ±${prediction.confidenceH} ч`}
            >
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      left: `${lowPct * 100}%`,
                      width: `${fillPct}%`,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.barMarker,
                    {
                      left: `${predPct}%`,
                      backgroundColor: palette.textOnAccent,
                    },
                  ]}
                />
              </View>
              <View style={styles.barLabels}>
                <Text style={styles.barLabelText}>~{low.time}</Text>
                <Text style={styles.barLabelText}>~{high.time}</Text>
              </View>
            </View>

            <View style={styles.sourceRow}>
              <Icon name="forecast" size={14} color={palette.textOnAccent} />
              <Text style={[styles.source, { color: palette.textOnAccent }]}>Метод: {sourceLabel}</Text>
            </View>
            <Text style={styles.barConfidence}>± ~{prediction.confidenceH} ч</Text>
          </View>
        </FadeIn>

        <Button
          title={justLogged ? 'Отмечено' : 'Отметить сейчас — дефекация'}
          icon={justLogged ? 'check' : 'check'}
          variant={justLogged ? undefined : 'secondary'}
          onPress={onQuickDefecation}
          style={styles.quickLog}
        />

        <Section
          title="Ваш прогресс"
          right={
            <Text style={{ fontSize: 13, fontWeight: '500', color: palette.textSecondary }}>
              {progStats.totalCount > 0
                ? `серия ${progStats.currentStreak} дн. · рекорд ${progStats.bestStreak}`
                : 'начните наблюдение'}
            </Text>
          }
        />
        <ProgressionCard stats={progStats} milestones={milestones} style={styles.progressCard} />

        <Section title="Что на это влияет" />
        <Card tone="default">
          {[
            { key: 'base', label: 'Ваш ритм (история)', value: prediction.factors.base, unit: ' ч' },
            { key: 'body', label: 'Тело', value: prediction.factors.body, unit: '×' },
            { key: 'food', label: 'Еда (последние 48 ч)', value: prediction.factors.food, unit: '×' },
            { key: 'rhythm', label: 'Суточный ритм', value: prediction.factors.rhythm, unit: '×' },
          ].map((f) => (
            <View key={f.key} style={styles.factorRow}>
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
          title={busy ? 'Устанавливаем…' : `Напомнить за ${lead} мин.`}
          icon="alarm"
          loading={busy}
          onPress={onSetAlarm}
          style={styles.spacer}
        />
        <Text style={[styles.hint, { color: palette.textSecondary }]}>
          Напоминание: время звонка указано в настройках — перед прогнозом.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: space.xl, paddingTop: 16 },
  loading: { textAlign: 'center', marginTop: 60 },

  // accent hero
  hero: {
    marginTop: space.sm,
    marginBottom: space.lg,
    overflow: 'hidden',
    paddingVertical: space.xxl,
    paddingHorizontal: space.xl,
  },
  accentLabel: { fontSize: type.label, fontWeight: '500', opacity: 0.92, marginBottom: space.sm },
  accentDate: { fontSize: 22, fontWeight: type.heavy, textTransform: 'capitalize' },
  accentTimeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  accentTime: { fontSize: 42, fontWeight: type.heavy, letterSpacing: -1 },
  shiftChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: space.md,
  },
  shift: { fontSize: type.body, fontWeight: '600' },
  barArea: { marginTop: space.xl },
  barTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  barMarker: {
    position: 'absolute',
    top: -3,
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    marginLeft: -7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  barLabelText: { fontSize: 11, color: '#FFFFFF', opacity: 0.78 },
  barConfidence: {
    position: 'absolute',
    right: space.xl,
    top: space.xxl,
    fontSize: type.caption,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sourceRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg },
  source: { fontSize: type.caption, marginLeft: 6, opacity: 0.9 },

  // quick log
  quickLog: { marginBottom: 2 },

  // progress
  progressCard: { marginBottom: space.sm },

  // factor rows
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  factorLabel: { fontSize: type.body, flex: 1, paddingRight: 12 },
  factorPill: {
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  factorValue: { fontSize: 14, fontWeight: '600' },

  // empty state
  emptyBox: { borderRadius: radius.md, padding: space.xl, alignItems: 'center', marginTop: space.sm },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  emptyTitle: { fontSize: type.title, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: type.body, textAlign: 'center', marginTop: 6, marginBottom: space.xl, lineHeight: 22 },
  emptyCta: { marginBottom: space.md, alignSelf: 'stretch' },

  spacer: { marginTop: space.md, marginBottom: space.sm },
  hint: { fontSize: type.caption, textAlign: 'center', marginBottom: 20 },
});