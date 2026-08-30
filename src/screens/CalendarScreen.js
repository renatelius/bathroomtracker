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
          container: { backgroundColor: '#eaf1ff', borderRadius: 100 },
        };
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    // День прогноза — акцентный
    const pKey = dayKey(p.predictedAtMs);
    marks[pKey] = marks[pKey] || {};
    marks[pKey].customStyles = {
      container: {
        backgroundColor: '#2f6fed',
        borderRadius: 100,
      },
      text: { color: '#fff', fontWeight: '700' },
    };
    marks[pKey].selected = true;

    // Сегодня — рамка
    marks[today] = marks[today] || {};
    marks[today].customStyles = marks[today].customStyles || {};
    marks[today].customStyles.container = {
      ...(marks[today].customStyles.container || {}),
      borderWidth: 1,
      borderColor: '#2f6fed',
    };

    setMarked(marks);
  }, []);

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
      const when = new Date(prediction.predictedAtMs);
      await cancelPrediction();
      await schedulePrediction({
        timeMs: prediction.predictedAtMs,
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
    <SafeAreaView style={styles.flex}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Календарь</Text>
        </View>

        <Calendar
          markingType="custom"
          markedDates={marked}
          current={todayStr()}
          theme={{
            selectedDayBackgroundColor: '#2f6fed',
            todayTextColor: '#2f6fed',
            arrowColor: '#2f6fed',
            textDayFontSize: 14,
            textMonthFontWeight: '700',
            textDayHeaderFontSize: 12,
            textSectionTitleColor: '#888',
          }}
        />

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#27ae60' }]} />
            <Text style={styles.legendText}>Дефекация</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#f39c12' }]} />
            <Text style={styles.legendText}>Приём пищи</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#2f6fed' }]} />
            <Text style={styles.legendText}>Прогноз</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.windowSwatch} />
            <Text style={styles.legendText}>Окно достоверности</Text>
          </View>
        </View>

        {prediction && (
          <View style={styles.predictionCard}>
            <Text style={styles.cardLabel}>Прогноз следующей дефекации</Text>
            <Text style={styles.cardDate}>
              {when.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Text style={styles.cardTime}>
              ~{when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.cardRange}>
              окно: {new Date(prediction.lowMs).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} —{' '}
              {new Date(prediction.highMs).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </Text>
            <TouchableOpacity
              style={[styles.alarmBtn, busy && { opacity: 0.6 }]}
              onPress={onSetAlarm}
              disabled={busy}
            >
              <Text style={styles.alarmBtnText}>🔔 Поставить напоминание</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f5f7fb' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#111' },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  windowSwatch: { width: 16, height: 10, borderRadius: 3, backgroundColor: '#eaf1ff', marginRight: 6 },
  legendText: { fontSize: 12, color: '#555' },
  predictionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    marginTop: 8,
  },
  cardLabel: { fontSize: 13, color: '#888', marginBottom: 6 },
  cardDate: { fontSize: 18, fontWeight: '700', color: '#111', textTransform: 'capitalize' },
  cardTime: { fontSize: 26, fontWeight: '800', color: '#2f6fed', marginTop: 2 },
  cardRange: { fontSize: 13, color: '#777', marginTop: 4 },
  alarmBtn: {
    marginTop: 16,
    backgroundColor: '#2f6fed',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  alarmBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
