import React, { useState, useCallback } from 'react';
import { ScrollView, Text, Switch, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getSettings, saveSettings, getProfile, getDefecations, getMeals } from '../store/storage';
import { predict } from '../model/model.mjs';
import { applyReminder, cancelAlarm, calendarPermission } from '../services/alarmService';
import { ScreenHeader, Card, Chip, Button, Section, Icon } from '../ui';
import { useThemeColors, type, space } from '../theme';

const LEAD_OPTIONS = [0, 5, 10, 15, 30, 60];

export default function SettingsScreen() {
  const palette = useThemeColors();
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const persist = useCallback(async (patch) => {
    const next = await saveSettings(patch);
    setSettings(next);
    return next;
  }, []);

  async function applyToPrediction() {
    const profile = await getProfile();
    const defecations = await getDefecations();
    const meals = await getMeals();
    return predict({ defecations, meals, profile, nowMs: Date.now() });
  }

  async function onToggleAlarm(value) {
    setBusy(true);
    try {
      if (value) {
        const s = await persist({ alarmEnabled: true });
        const prediction = await applyToPrediction();
        await applyReminder({ prediction, settings: s });
        Alert.alert('Включено', `Напоминание за ${s.alarmLeadMinutes === 0 ? 'точно к' : s.alarmLeadMinutes} мин. до прогноза.`);
      } else {
        await persist({ alarmEnabled: false });
        await cancelAlarm();
        Alert.alert('Выключено', 'Напоминание отменено.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function onChangeLead(min) {
    const s = await persist({ alarmLeadMinutes: min });
    if (s.alarmEnabled) {
      const prediction = await applyToPrediction();
      await applyReminder({ prediction, settings: s });
    }
  }

  async function onToggleCalendar(value) {
    setBusy(true);
    try {
      if (value) {
        const ok = await calendarPermission();
        if (!ok) {
          Alert.alert('Нет доступа', 'Разрешите доступ к календарю в настройках системы.');
          return;
        }
        const s = await persist({ calendarEnabled: true });
        const prediction = await applyToPrediction();
        await applyReminder({ prediction, settings: s });
        Alert.alert('Календарь включён', 'Событие прогноза добавлено в системный календарь.');
      } else {
        await persist({ calendarEnabled: false });
        Alert.alert('Календарь выключен');
      }
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
        <Text style={[styles.loading, { color: palette.textMuted }]}>Загрузка…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Настройки" subtitle="Напоминания и календарь" icon="settings" />

        <Card>
          <Row
            icon="alarm"
            title="Напоминание"
            desc="Громкое уведомление перед прогнозом. По желанию."
            control={
              <Switch value={settings.alarmEnabled} onValueChange={onToggleAlarm} disabled={busy}
                trackColor={{ false: palette.surfaceAlt, true: palette.accent }} thumbColor={palette.surface} />
            }
          />

          {settings.alarmEnabled && (
            <>
              <Text style={[styles.subNote, { color: palette.textSecondary }]}>Звонить за, минут</Text>
              <View style={styles.chips}>
                {LEAD_OPTIONS.map((m) => (
                  <Chip
                    key={m}
                    label={m === 0 ? '0 (точно)' : `${m}`}
                    active={settings.alarmLeadMinutes === m}
                    onPress={() => onChangeLead(m)}
                  />
                ))}
              </View>
            </>
          )}
        </Card>

        <Card>
          <Row
            icon="calendar"
            title="Событие в календаре"
            desc="Добавлять прогноз как событие в системный календарь."
            control={
              <Switch value={settings.calendarEnabled} onValueChange={onToggleCalendar} disabled={busy}
                trackColor={{ false: palette.surfaceAlt, true: palette.accent }} thumbColor={palette.surface} />
            }
          />
        </Card>

        <Button
          title="Применить сейчас"
          icon="plus"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            try {
              const s = await getSettings();
              const prediction = await applyToPrediction();
              if (s.alarmEnabled || s.calendarEnabled) {
                await applyReminder({ prediction, settings: s });
                Alert.alert('Применено', 'Напоминание и/или событие календаря обновлены под текущий прогноз.');
              } else {
                Alert.alert('Ничего не включено', 'Включите напоминание или календарь выше.');
              }
            } finally { setBusy(false); }
          }}
          style={styles.spacer}
        />

        <View style={[styles.noteBox, { backgroundColor: palette.infoSoft }]}>
          <Text style={[styles.note, { color: palette.textSecondary }]}>
            В экспресс-версии напоминание работает как громкое уведомление. Полный системный
            звонок появится в собранной версии приложения.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, title, desc, control }) {
  const palette = useThemeColors();
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: palette.accentSoft }]}>
        <Icon name={icon} size={20} color={palette.accent} />
      </View>
      <View style={{ flex: 1, paddingHorizontal: space.md }}>
        <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{title}</Text>
        <Text style={[styles.rowDesc, { color: palette.textSecondary }]}>{desc}</Text>
      </View>
      {control}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: space.xl, paddingTop: 16 },
  loading: { textAlign: 'center', marginTop: 60 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: type.semibold },
  rowDesc: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  subNote: { fontSize: type.label, fontWeight: type.semibold, marginTop: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm },
  spacer: { marginTop: space.md },
  noteBox: { borderRadius: 14, padding: space.md, marginTop: space.md },
  note: { fontSize: type.caption, lineHeight: 17 },
});
