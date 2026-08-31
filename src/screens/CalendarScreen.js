import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { predict } from '../model/model.mjs';
import { getProfile, getDefecations, getMeals } from '../store/storage';
import { schedulePrediction, cancelPrediction, ensurePermissions } from '../services/notifications';
import { getSettings } from '../store/storage';
import { useThemeColors, type, space } from '../theme';
import { ScreenHeader, Card, Button, Icon } from '../ui';
LocaleConfig.locales['ru'] = {
  monthNames: [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ],
  monthNamesShort: [
    'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
    'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
  ],
  dayNames: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
  dayNamesShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  today: 'Сегодня',
};
LocaleConfig.defaultLocale = 'ru';

const todayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const dayKey = (ms) => {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export default function CalendarScreen() {
  const palette = useThemeColors();
  const [marked, setMarked] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const profile = await getProfile();
    const defecations = await getDefecations();
    const meals = await getMeals();
    const p = predict({ defecations, meals, profile, nowMs: Date.now() });
    setPrediction(p);

    const marks = {};

    // Дни с дефекациями — синяя точка
    defecations.forEach((d) => {
      const k = dayKey(d.timeMs);
      marks[k] = marks[k] || {};
      marks[k].dots = marks[k].dots || [];
      marks[k].dots.push({ key: 'def', color: '#27ae60' });
    });
    // Дни с едой — оранжевая точка
    meals.forEach((m) => {
      const k = dayKey(m.timeMs);
      marks[k] = marks[k] || {};
      marks[k].dots = marks[k].dots || [];
      marks[k].dots.push({ key: 'meal', color: '#f39c12' });
    });

    // Окно достоверности low..high — мягкая подсветка диапазона (кроме прогноза)
    const today = todayStr();
    const lowKey = dayKey(p.lowMs);
    const highKey = dayKey(p.highMs);
    let cursor = new Date(p.lowMs);
    cursor.setHours(0, 0, 0, 0);
    const high = new Date(p.highMs);
    high.setHours(0, 0, 0, 0);
    while (cursor <= high) {
      const k = dayKey(cursor.getTime());
      if (k >= lowKey && k <= highKey && k !== dayKey(p.predictedAtMs)) {
        marks[k] = marks[k] || {};
        marks[k].customStyles = {
          container: { backgroundColor: palette.accentSoft, borderRadius: 100 },
        };
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    // День прогноза — акцентный
    const pKey = dayKey(p.predictedAtMs);
    marks[pKey] = marks[pKey] || {};
    marks[pKey].customStyles = {
      container: {
        backgroundColor: palette.accent,
        borderRadius: 100,
      },
      text: { color: palette.textOnAccent, fontWeight: '700' },
    };
    marks[pKey].selected = true;

    // Сегодня — рамка
    marks[today] = marks[today] || {};
    marks[today].customStyles = marks[today].customStyles || {};
    marks[today].customStyles.container = {
      ...(marks[today].customStyles.container || {}),
      borderWidth: 1,
      borderColor: palette.accent,
    };

    setMarked(marks);
  }, [palette]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onSetAlarm() {
    setBusy(true);
    try {
      if (!prediction) {
        Alert.alert('Нет прогноза', 'Сначала соберите чуть больше записей.');
        return;
      }
      const { granted } = await ensurePermissions();
      if (!granted) {
        Alert.alert(
          'Нет доступа к уведомлениям',
          'Разрешите уведомления в настройках, чтобы будильник работал.'
        );
        return;
      }
      const settings = await getSettings();
      const when = new Date(prediction.predictedAtMs);
      await cancelPrediction();
      await schedulePrediction({
        predictedAtMs: prediction.predictedAtMs,
        leadMinutes: settings.alarmLeadMinutes,
        title: 'Прогноз дефекации',
        body: `По расчётам — примерно ${when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}.`,
      });
      Alert.alert('Готово', `Напоминание установлено на ${when.toLocaleDateString('ru-RU')} ~${when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}.`);
    } catch (e) {
      Alert.alert('Ошибка', e.message || 'Не удалось установить напоминание');
    } finally {
      setBusy(false);
    }
  }

  const when = prediction
    ? new Date(prediction.predictedAtMs)
    : null;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
      <ScrollView>
        <View style={styles.header}>
          <ScreenHeader title="Календарь" subtitle="Прогноз и записи" icon="calendar" />
        </View>

        <Calendar
          markingType="custom"
          markedDates={marked}
          current={todayStr()}
          theme={{
            selectedDayBackgroundColor: palette.accent,
            todayTextColor: palette.accent,
            arrowColor: palette.accent,
            textDayFontSize: 14,
            textMonthFontWeight: '700',
            textDayHeaderFontSize: 12,
            textSectionTitlecolor: palette.textMuted,
          }}
        />

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#27ae60' }]} />
            <Text style={[styles.legendText, { color: palette.textSecondary }]}>Дефекация</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#f39c12' }]} />
            <Text style={[styles.legendText, { color: palette.textSecondary }]}>Приём пищи</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: palette.accent }]} />
            <Text style={[styles.legendText, { color: palette.textSecondary }]}>Прогноз</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.windowSwatch, { backgroundColor: palette.accentSoft }]} />
            <Text style={[styles.legendText, { color: palette.textSecondary }]}>Окно достоверности</Text>
          </View>
        </View>

        {prediction && (
          <View style={[styles.predictionCard, { backgroundColor: palette.surface }]}>
            <Text style={[styles.cardLabel, { color: palette.textMuted }]}>Прогноз следующей дефекации</Text>
            <Text style={[styles.cardDate, { color: palette.textPrimary }]}>
              {when.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Text style={[styles.cardTime, { color: palette.accent }]}>
              ~{when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={[styles.cardRange, { color: palette.textSecondary }]}>
              окно: {new Date(prediction.lowMs).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} —{' '}
              {new Date(prediction.highMs).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </Text>
            <TouchableOpacity
              style={[styles.alarmBtn, { backgroundColor: palette.accent }, busy && { opacity: 0.6 }]}
              onPress={onSetAlarm}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Поставить напоминание о прогнозе"
              accessibilityState={{ disabled: busy }}
            >
              <Text style={[styles.alarmBtnText, { color: palette.textOnAccent }]}>🔔 Поставить напоминание</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700' },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  windowSwatch: { width: 16, height: 10, borderRadius: 3, marginRight: 6 },
  legendText: { fontSize: 12 },
  predictionCard: {
    borderRadius: 16,
    padding: 20,
    margin: 20,
    marginTop: 8,
  },
  cardLabel: { fontSize: 13, marginBottom: 6 },
  cardDate: { fontSize: 18, fontWeight: '700', textTransform: 'capitalize' },
  cardTime: { fontSize: 26, fontWeight: '800', marginTop: 2 },
  cardRange: { fontSize: 13, marginTop: 4 },
  alarmBtn: {
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  alarmBtnText: { fontWeight: '600', fontSize: 15 },
});
