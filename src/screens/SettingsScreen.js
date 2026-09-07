import React, { useState, useCallback } from 'react';
import { View, ScrollView, Text, Switch, StyleSheet, Alert, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { getSettings, saveSettings, getProfile, getDefecations, getMeals, exportData, importData } from '../store/storage';
import { predict } from '../model/model.mjs';
import { applyReminder, cancelAlarm, calendarPermission } from '../services/alarmService';
import { ScreenHeader, Card, Chip, Button, Section, TextField, Icon } from '../ui';
import { useThemeColors, useAura, AURAS, type, space, radius } from '../theme';

const LEAD_OPTIONS = [0, 5, 10, 15, 30, 60];

export default function SettingsScreen() {
  const palette = useThemeColors();
  const navigation = useNavigation();
  const { aura, setAura } = useAura();
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [exportedText, setExportedText] = useState('');
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

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
        const res = await applyReminder({ prediction, settings: s });
        if (res.alarmReason === 'too_soon') {
          Alert.alert('Слишком скоро', 'Следующий прогноз меньше чем за выбранное время — напоминание не поставлено.');
        } else if (res.alarmReason === 'no_permission') {
          Alert.alert('Нет разрешения', 'Разрешите уведомления в настройках системы, чтобы включить напоминание.');
        } else {
          Alert.alert('Включено', `Напоминание за ${s.alarmLeadMinutes === 0 ? 'точно к' : s.alarmLeadMinutes} мин. до прогноза.`);
        }
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

  function downloadJSON(filename, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function onExport() {
    const data = await exportData();
    const text = JSON.stringify(data, null, 2);
    setExportedText(text);
    if (Platform.OS === 'web') {
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJSON(`bathroomtracker-backup-${stamp}.json`, text);
    }
  }

  function onExportPressed() {
    Alert.alert(
      'Экспорт данных?',
      'Файл содержит личные данные о здоровье (профиль, история, приёмы пищи). Он сохраняется локально на вашем устройстве.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Экспортировать', onPress: onExport },
      ]
    );
  }

  async function copyToClipboard(text) {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Скопировано', 'Данные JSON скопированы в буфер обмена.');
      return;
    } catch (e) {
      // Фолбэк для web на http (dev) или устаревших браузеров.
      let ok = false;
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (_) { /* ignore */ }
      Alert.alert(
        ok ? 'Скопировано' : 'Не удалось скопировать',
        ok ? 'Данные JSON в буфере обмена.' : 'Выделите текст вручную и скопируйте его.'
      );
    }
  }

  async function onImport() {
    const raw = (importText || '').trim();
    if (!raw) {
      Alert.alert('Пусто', 'Вставьте данные из файла экспорта.');
      return;
    }
    setImporting(true);
    try {
      const parsed = JSON.parse(raw);
      Alert.alert(
        'Импортировать данные?',
        'Записи дефекаций и приёмы пищи будут добавлены к текущим (без дублей). Профиль и настройки обновятся. Обработка локальная — данные не отправляются.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Импортировать',
            onPress: async () => {
              try {
                await importData(parsed);
                setImportText('');
                const s = await getSettings();
                setSettings(s);
                Alert.alert('Готово', 'Данные импортированы.');
              } catch (e) {
                Alert.alert('Ошибка', e && e.message ? e.message : 'Не удалось импортировать данные.');
              }
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Неверный JSON', 'Не удалось разобрать вставленные данные. Скопируйте файл целиком.');
    } finally {
      setImporting(false);
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
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: palette.surfaceAlt }]}
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Назад в профиль"
          >
            <Icon name="arrowLeft" size={20} color={palette.accent} />
          </TouchableOpacity>
        </View>
        <ScreenHeader title="Настройки" subtitle="Напоминания и календарь" icon="settings" />

        <Card>
          <Row
            icon="alarm"
            title="Напоминание"
            desc="Громкое уведомление перед прогнозом. По желанию."
            control={
              <Switch value={settings.alarmEnabled} onValueChange={onToggleAlarm} disabled={busy}
                trackColor={{ false: palette.surfaceAlt, true: palette.accent }} thumbColor={palette.surface}
                accessibilityRole="switch" accessibilityLabel="Напоминание" accessibilityState={{ checked: settings.alarmEnabled }} />
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
                trackColor={{ false: palette.surfaceAlt, true: palette.accent }} thumbColor={palette.surface}
                accessibilityRole="switch" accessibilityLabel="Событие в календаре" accessibilityState={{ checked: settings.calendarEnabled }} />
            }
          />
        </Card>

        <Card>
          <Section title="Аура" />
          <Text style={[styles.rowDesc, { color: palette.textSecondary, marginBottom: space.md }]}>
            Персональная тема оформления. Меняемся мгновенно, сохраняется на устройстве.
          </Text>
          <View style={styles.auraRow}>
            {AURAS.map((a) => {
              const active = aura === a.id;
              return (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setAura(a.id)}
                  activeOpacity={0.75}
                  style={[
                    styles.auraChip,
                    { backgroundColor: palette.surfaceAlt, borderColor: active ? palette.accent : palette.border },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={a.name}
                >
                  <Text style={styles.auraEmoji}>{a.emoji}</Text>
                  <Text style={[styles.auraName, { color: active ? palette.accent : palette.textPrimary }]}>
                    {a.name}
                  </Text>
                  {active ? <Icon name="check" size={15} color={palette.accent} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Button
          title="Применить к прогнозу"
          icon="alarm"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            try {
              const s = await getSettings();
              const prediction = await applyToPrediction();
              if (s.alarmEnabled || s.calendarEnabled) {
                const res = await applyReminder({ prediction, settings: s });
                if (s.alarmEnabled && res.alarmReason === 'too_soon') {
                  Alert.alert('Слишком скоро', 'Следующий прогноз меньше чем за выбранное время — напоминание не поставлено.');
                } else if (s.alarmEnabled && res.alarmReason === 'no_permission') {
                  Alert.alert('Нет разрешения', 'Разрешите уведомления в настройках системы.');
                } else {
                  Alert.alert('Применено', 'Напоминание и/или событие календаря обновлены под текущий прогноз.');
                }
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

        <Card>
          <Section title="Данные" />
          <Text style={[styles.rowDesc, { color: palette.textSecondary, marginBottom: space.md }]}>
            Резервная копия в формате JSON: профиль, история, приёмы пищи и настройки.
          </Text>
          <Button
            title="Экспорт в JSON"
            icon="copy"
            variant="secondary"
            onPress={onExportPressed}
            style={styles.spacer}
          />
          {exportedText ? (
            <>
              <TextField
                label="Ваши данные (скопируйте или сохраните файл)"
                multiline
                value={exportedText}
                onChangeText={setExportedText}
                inputStyle={styles.mono}
                style={{ marginTop: space.md }}
              />
              <Button
                title="Скопировать в буфер"
                icon="copy"
                variant="secondary"
                onPress={() => copyToClipboard(exportedText)}
                style={styles.spacer}
              />
            </>
          ) : null}

          <TextField
            label="Импорт (вставьте JSON)"
            multiline
            value={importText}
            onChangeText={setImportText}
            placeholder='Сюда — данные из экспорта…'
            style={{ marginTop: space.md }}
          />
          <Button
            title="Импортировать"
            icon="check"
            variant="secondary"
            loading={importing}
            onPress={onImport}
            style={styles.spacer}
          />
        </Card>

        <Card>
          <Section title="Приватность" />
          <Text style={[styles.rowDesc, { color: palette.textSecondary }]}>
            Все данные (профиль, история, приёмы пищи, настройки) хранятся только на этом устройстве.
            Приложение не собирает телеметрию и не требует учётную запись.
          </Text>
          <Text style={[styles.rowDesc, { color: palette.textSecondary, marginTop: space.sm }]}>
            Демо-оценка по фото выполняется локально — снимки никуда не передаются.
            Резервные копии содержат личные данные, храните их в безопасном месте.
          </Text>
          <TouchableOpacity
            style={[styles.securityRow, { marginTop: space.md }]}
            onPress={() => navigation.navigate('Синхронизация')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Синхронизация: облачный бэкап с шифрованием"
          >
            <View style={[styles.iconWrap, { backgroundColor: palette.infoSoft }]}>
              <Icon name="cloud" size={20} color={palette.accent} />
            </View>
            <Text style={[styles.securityLabel, { color: palette.textPrimary }]}>☁️ Синхронизация с облаком</Text>
            <Icon name="arrowRight" size={18} color={palette.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.securityRow, { marginTop: space.md }]}
            onPress={() => navigation.navigate('Безопасность')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Безопасность: шифрование данных"
          >
            <View style={[styles.iconWrap, { backgroundColor: palette.successSoft }]}>
              <Icon name="lock" size={20} color={palette.successText} />
            </View>
            <Text style={[styles.securityLabel, { color: palette.textPrimary }]}>🔐 Безопасность данных</Text>
            <Icon name="arrowRight" size={18} color={palette.textMuted} />
          </TouchableOpacity>
        </Card>
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
  navRow: { marginBottom: space.md },
  backBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: type.semibold },
  rowDesc: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  subNote: { fontSize: type.label, fontWeight: type.semibold, marginTop: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm },
  spacer: { marginTop: space.md },
  securityRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  securityLabel: { fontSize: 15, fontWeight: type.medium, flex: 1, paddingLeft: space.md },
  noteBox: { borderRadius: 14, padding: space.md, marginTop: space.md },
  note: { fontSize: type.caption, lineHeight: 17 },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
  auraRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  auraChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
  },
  auraEmoji: { fontSize: 16 },
  auraName: { fontSize: 14, fontWeight: type.medium },
});
