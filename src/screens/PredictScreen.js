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
import { ScreenHeader, Card, Button, Section, Icon, FadeIn, ProgressionCard, ProgressRing, DefecationModal, EmptyState } from '../ui';
import { useThemeColors, type, space, radius, shadow } from '../theme';

const DAY = 24 * 3600e3;

function fmtTime(ms, locale) {
  const d = new Date(ms);
  const date = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', weekday: 'long' });
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

function dateKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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
  const [meals, setMeals] = useState([]);
  const [justLogged, setJustLogged] = useState(false);
  const [defModalVisible, setDefModalVisible] = useState(false);

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
    setMeals(meals);
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

  async function onSaveDefecation({ bristol, comfort }) {
    await addDefecation({ id: `d_${Date.now()}`, timeMs: Date.now(), bristol, comfort });
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

  const todayKey = dateKey(Date.now());

  const todayEntries = useMemo(
    () =>
      [
        ...defecations.filter((d) => dateKey(d.timeMs) === todayKey),
        ...meals.filter((m) => dateKey(m.timeMs) === todayKey),
      ].sort((a, b) => b.timeMs - a.timeMs),
    [defecations, meals, todayKey]
  );

  // Прогресс дня: доля прошедшего времени суток (кольцо в hero).
  const startOfDay = () => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); };
  const dayProgress = Math.min(1, (Date.now() - startOfDay()) / DAY);

  if (!prediction) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
        <ScrollView contentContainerStyle={styles.container}>
          <ScreenHeader title="Сегодня" subtitle="Ваш день — с чистого листа" icon="home" />

          <FadeIn>
            <EmptyState
              variant="leaf"
              title="Пока нет достаточных данных"
              subtitle="Добавьте первую запись — прогноз появится после пары дней наблюдений."
            >
              <Button
                title={justLogged ? 'Отмечено' : 'Записать дефекацию'}
                icon={justLogged ? 'check' : 'check'}
                onPress={() => setDefModalVisible(true)}
                style={styles.emptyCta}
              />
              <Button
                title="Добавить приём пищи"
                icon="food"
                variant="secondary"
                onPress={() => navigation.navigate('Лог', { initialMode: 'search' })}
              />
            </EmptyState>
          </FadeIn>
        </ScrollView>
        <DefecationModal
          visible={defModalVisible}
          onClose={() => setDefModalVisible(false)}
          onSave={onSaveDefecation}
        />
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

  const windowMs = prediction.highMs - prediction.lowMs;
  const rangeMs = windowMs * 2 || 1;
  const lowPct = (prediction.lowMs - (prediction.predictedAtMs - rangeMs / 2)) / rangeMs;
  const fillPct = Math.max(0, Math.min(100, (windowMs / rangeMs) * 100));
  const predPct = 50;

  const todayFmtTimes = todayEntries.map((d) =>
    new Date(d.timeMs).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.container}
      >
        <ScreenHeader title="Сегодня" subtitle="День по плану" icon="home" />

        {/* Hero — прогноз + кольцо прогресса дня */}
        <FadeIn>
          <LinearGradient
            colors={palette.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { borderRadius: radius.xl, ...shadow.accent }]}
            accessible
            accessibilityLabel={`Следующая дефекация вероятнее всего ${main.date} примерно в ${main.time} (${shiftText}). ${sourceLabel}`}
          >
            <View style={styles.heroRing}>
              <ProgressRing
                size={118}
                stroke={11}
                progress={dayProgress}
                color="#FFFFFF"
                trackColor="rgba(255,255,255,0.28)"
                centerValue={todayEntries.length}
                centerLabel=""
                centerHint={todayEntries.length === 1 ? 'отметка' : 'отметки'}
              />
            </View>
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

            <View style={styles.barArea} accessible accessibilityLabel={`Окно достоверности: с ${low.date} ${low.time} до ${high.date} ${high.time}, погрешность ±${prediction.confidenceH} ч`}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { left: `${lowPct * 100}%`, width: `${fillPct}%` }]} />
                <View style={[styles.barMarker, { left: `${predPct}%` }]} />
              </View>
              <View style={styles.barLabels}>
                <Text style={styles.barLabelText}>~{low.time}</Text>
                <Text style={styles.barLabelText}>~{high.time}</Text>
              </View>
            </View>

            <View style={styles.sourceRow}>
              <Icon name="forecast" size={14} color={palette.textOnAccent} />
              <Text style={[styles.source, { color: palette.textOnAccent }]}>Метод: {sourceLabel}</Text>
              <Text style={[styles.barConfidence, { color: palette.textOnAccent }]}>± ~{prediction.confidenceH} ч</Text>
            </View>
          </LinearGradient>
        </FadeIn>

        {/* Сегодня — сводка + мини-таймлайн */}
        <Section
          title="Сегодня"
          right={
            todayEntries.length > 0 ? (
              <Text style={{ fontSize: 13, fontWeight: '500', color: palette.textSecondary }}>
                {todayEntries.length} {todayEntries.length === 1 ? 'запись' : todayEntries.length < 5 ? 'записи' : 'записей'}
              </Text>
            ) : null
          }
        />
        <Card tone={todayEntries.length ? 'default' : 'info'}>
          {todayEntries.length === 0 ? (
            <View style={styles.dayEmpty}>
              <Icon name="leaf" size={22} color={palette.accent} />
              <Text style={[styles.dayEmptyText, { color: palette.textSecondary }]}>
                Сегодня пока ничего не отмечено. Добавьте запись, чтобы день вошёл в статистику.
              </Text>
            </View>
          ) : (
            <View>
              {todayEntries.slice(0, 5).map((d, i) => {
                const isMeal = d.source != null;
                const accentColor = isMeal ? palette.warning : palette.success;
                return (
                  <View key={d.id} style={[styles.dayRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.divider }]}>
                    <View style={[styles.dayDot, { backgroundColor: accentColor }]} />
                    <Text style={[styles.dayTime, { color: palette.textPrimary }]}>{todayFmtTimes[i]}</Text>
                    {isMeal ? (
                      <>
                        <Text style={[styles.dayLabel, { color: palette.textSecondary }]} numberOfLines={1}>{d.name}</Text>
                        <View style={[styles.dayPill, { backgroundColor: palette.warningSoft }]}>
                          <Text style={[styles.dayPillText, { color: palette.warningSoftText }]}>
                            {d.kcal != null ? `~${d.kcal} ккал` : 'приём пищи'}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.dayLabel, { color: palette.textSecondary }]}>Дефекация</Text>
                        <View style={[styles.dayPill, { backgroundColor: palette.successSoft }]}>
                          <Text style={[styles.dayPillText, { color: palette.successText }]}>{d.bristol ? `Тип ${d.bristol}` : 'отмечено'}</Text>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
              {todayEntries.length > 5 ? (
                <Text style={[styles.dayMore, { color: palette.textMuted }]}>
                  и ещё {todayEntries.length - 5} {todayEntries.length - 5 === 1 ? 'запись' : todayEntries.length - 5 < 5 ? 'записи' : 'записей'}
                </Text>
              ) : null}
            </View>
          )}
        </Card>

        <Button
          title={justLogged ? 'Отмечено' : 'Отметить сейчас — дефекация'}
          icon={justLogged ? 'check' : 'check'}
          variant={justLogged ? undefined : 'secondary'}
          onPress={() => setDefModalVisible(true)}
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
      <DefecationModal
        visible={defModalVisible}
        onClose={() => setDefModalVisible(false)}
        onSave={onSaveDefecation}
      />
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
  heroRing: { position: 'absolute', right: space.xl, top: space.xl },
  accentLabel: { fontSize: type.label, fontWeight: '500', opacity: 0.92, marginBottom: space.sm, marginRight: 120 },
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
    fontSize: type.caption,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  sourceRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg },
  source: { fontSize: type.caption, marginLeft: 6, opacity: 0.9, flexShrink: 1 },

  // today summary
  dayEmpty: { flexDirection: 'row', alignItems: 'center' },
  dayEmptyText: { fontSize: type.body, marginLeft: space.md, flex: 1, lineHeight: 22 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
  },
  dayDot: { width: 8, height: 8, borderRadius: radius.pill, marginRight: space.md },
  dayTime: { fontSize: type.body, fontWeight: '600', marginRight: space.lg },
  dayLabel: { fontSize: type.body, flex: 1 },
  dayPill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayPillText: { fontSize: type.caption, fontWeight: '600' },
  dayMore: { fontSize: type.caption, marginTop: space.sm, textAlign: 'center' },

  // quick log
  quickLog: { marginBottom: 2 },

  progressCard: { marginBottom: space.sm },

  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  factorLabel: { fontSize: type.body, flex: 1, paddingRight: 12 },
  factorPill: { borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 5 },
  factorValue: { fontSize: 14, fontWeight: '600' },

  emptyBox: { borderRadius: radius.xl, padding: space.xl, alignItems: 'center', marginTop: space.sm },
  emptyIcon: { width: 64, height: 64, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  emptyTitle: { fontSize: type.title, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: type.body, textAlign: 'center', marginTop: 6, marginBottom: space.xl, lineHeight: 22 },
  emptyCta: { marginBottom: space.md, alignSelf: 'stretch' },

  spacer: { marginTop: space.md, marginBottom: space.sm },
  hint: { fontSize: type.caption, textAlign: 'center', marginBottom: 20 },
});