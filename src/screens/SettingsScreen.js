import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getSettings, saveSettings } from '../store/storage';
import { getProfile, getDefecations, getMeals } from '../store/storage';
import { predict } from '../model/model.mjs';
import { applyReminder, cancelAlarm, calendarPermission } from '../services/alarmService';

const LEAD_OPTIONS = [0, 5, 10, 15, 30, 60];

export default function SettingsScreen() {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const persist = useCallback(async (patch) => {
    const next = await saveSettings(patch);
    setSettings(next);
    return next;
  }, []);

  async function onToggleAlarm(value) {
    if (value) {
      // при включении применяем текущий прогноз как напоминание
      const profile = await getProfile();
      const defecations = await getDefecations();
      const meals = await getMeals();
      const prediction = predict({ defecations, meals, profile, nowMs: Date.now() });
      const s = await persist({ alarmEnabled: true });
      await applyReminder({ prediction, settings: s });
      Alert.alert('Включено', `Будильник установлен за ${s.alarmLeadMinutes} мин. до прогноза.`);
    } else {
      await persist({ alarmEnabled: false });
      await cancelAlarm();
      Alert.alert('Выключено', 'Будильник отменён.');
    }
  }

  async function onChangeLead(min) {
    const s = await persist({ alarmLeadMinutes: min });
    // переприменим, если будильник включён
    if (s.alarmEnabled) {
      const profile = await getProfile();
      const defecations = await getDefecations();
      const meals = await getMeals();
      const prediction = predict({ defecations, meals, profile, nowMs: Date.now() });
      await applyReminder({ prediction, settings: s });
    }
  }

  async function onToggleCalendar(value) {
    if (value) {
      const ok = await calendarPermission();
      if (!ok) {
        Alert.alert('Нет доступа', 'Разрешите доступ к календарю в настройках системы.');
        return;
      }
      const s = await persist({ calendarEnabled: true });
      const profile = await getProfile();
      const defecations = await getDefecations();
      const meals = await getMeals();
      const prediction = predict({ defecations, meals, profile, nowMs: Date.now() });
      await applyReminder({ prediction, settings: s });
      Alert.alert('Календарь включён', 'Событие прогноза добавлено в системный календарь.');
    } else {
      await persist({ calendarEnabled: false });
      Alert.alert('Календарь выключен');
    }
  }

  if (!settings) {
    return (
      <SafeAreaView style={styles.flex}>
        <Text style={styles.loading}>Загрузка…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Настройки</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Напоминание-будильник</Text>
              <Text style={styles.rowDesc}>
                Звонок-уведомление перед прогнозом. По желанию.
              </Text>
            </View>
            <Switch value={settings.alarmEnabled} onValueChange={onToggleAlarm} />
          </View>

          {settings.alarmEnabled && (
            <View style={styles.leadBlock}>
              <Text style={styles.rowTitle}>Звонить за, минут</Text>
              <View style={styles.chips}>
                {LEAD_OPTIONS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.chip,
                      settings.alarmLeadMinutes === m && styles.chipActive,
                    ]}
                    onPress={() => onChangeLead(m)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        settings.alarmLeadMinutes === m && styles.chipTextActive,
                      ]}
                    >
                      {m === 0 ? '0 (точно)' : m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Событие в системном календаре</Text>
              <Text style={styles.rowDesc}>
                Добавлять прогноз как событие в календарь телефона.
              </Text>
            </View>
            <Switch value={settings.calendarEnabled} onValueChange={onToggleCalendar} />
          </View>
        </View>

        <Text style={styles.note}>
          Примечание: в экспресс-версии будильник работает как громкое уведомление.
          Полный системный звонок появится в собранной версии приложения.
        </Text>
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
    padding: 16,
    marginBottom: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  rowDesc: { fontSize: 13, color: '#888', marginTop: 4 },
  leadBlock: { marginTop: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f2f4f8',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: '#2f6fed' },
  chipText: { fontSize: 14, color: '#333' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  note: { fontSize: 12, color: '#999', marginTop: 4, lineHeight: 18 },
});
