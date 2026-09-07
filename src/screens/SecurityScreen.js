import React, { useState, useCallback } from 'react';
import { View, ScrollView, Text, Switch, StyleSheet, Alert, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { isEncryptionEnabled, setEncryptionEnabled, resetEncryption } from '../services/encryption';
import { enableEncryption, disableEncryption, clearAll } from '../store/storage';
import { ScreenHeader, Card, Button, Icon } from '../ui';
import { useThemeColors, type, space } from '../theme';

/** Хелпер-подтверждение: на web используем window.confirm, на native — Alert.alert. */
function confirmAsync(title, message) {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      // window.confirm показывает диалог с двумя кнопками (OK / Отмена).
      resolve(window.confirm(`${title}\n\n${message}`));
    } else {
      Alert.alert(title, message, [
        { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Далее', style: 'destructive', onPress: () => resolve(true) },
      ]);
    }
  });
}

export default function SecurityScreen() {
  const palette = useThemeColors();
  const navigation = useNavigation();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setEnabled(await isEncryptionEnabled());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleToggle(value) {
    if (busy) return;
    setBusy(true);
    try {
      if (value) {
        const ok = await enableEncryption();
        if (ok) {
          setEnabled(true);
          Alert.alert(
            '🔐 Шифрование включено',
            'Все данные теперь защищены AES-256. Ключ хранится в безопасном хранилище устройства.'
          );
        } else {
          Alert.alert('Ошибка', 'Не удалось включить шифрование.');
        }
      } else {
        const ok = await confirmAsync(
          '⚠️ Выключить шифрование?',
          'Данные будут расшифрованы и станут храниться в открытом виде. Это снижает защиту.'
        );
        if (ok) {
          const success = await disableEncryption();
          if (success) {
            setEnabled(false);
            Alert.alert('Шифрование выключено');
          } else {
            Alert.alert('Ошибка', 'Не удалось выключить шифрование.');
          }
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    const ok = await confirmAsync(
      '🗑 Сбросить ключ и данные?',
      'Ключ шифрования будет удалён, а все зашифрованные данные станут недоступны. Действие необратимо! Сначала сделайте экспорт данных в Настройках.'
    );
    if (!ok) return;
    setBusy(true);
    try {
      await resetEncryption();
      await clearAll();
      setEnabled(false);
      Alert.alert('Готово', 'Ключ сброшен, данные очищены.');
    } finally {
      setBusy(false);
    }
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
            accessibilityLabel="Назад в настройки"
          >
            <Icon name="arrowLeft" size={20} color={palette.accent} />
          </TouchableOpacity>
        </View>
        <ScreenHeader title="Безопасность" subtitle="Шифрование данных (AES-256)" icon="lock" />

        <Card>
          <Row
            icon="lock"
            title="Шифрование данных"
            desc="Записывать все данные в хранилище в зашифрованном виде."
            control={
              <Switch
                value={enabled}
                onValueChange={handleToggle}
                disabled={busy}
                trackColor={{ false: palette.surfaceAlt, true: palette.accent }}
                thumbColor={palette.surface}
                accessibilityRole="switch"
                accessibilityLabel="Шифрование данных"
                accessibilityState={{ checked: enabled }}
              />
            }
          />

          <View style={[styles.infoBox, { backgroundColor: enabled ? palette.successSoft : palette.warningSoft }]}>
            <Text style={[styles.infoText, { color: palette.textPrimary }]}>
              {enabled
                ? '✅ Защита активна: профиль, история, приёмы пищи, вода и стресс хранятся зашифрованными. Ключ недоступен другим приложениям.'
                : '⚠️ Хранилище открытое: любой с доступом к файлам устройства может прочитать данные. Рекомендуем включить шифрование.'}
            </Text>
          </View>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>🛡️ Уровень безопасности</Text>
          <InfoRow label="Алгоритм" value="AES-256 (CBC)" palette={palette} />
          <InfoRow
            label="Ключ шифрования"
            value={Platform.OS === 'web' ? 'Web-хранилище' : 'Keychain / Keystore'}
            palette={palette}
          />
          <InfoRow
            label="Доступ извне"
            value={enabled ? 'Заблокирован' : 'Возможен'}
            accent={enabled ? palette.successText : palette.danger}
            palette={palette}
          />
          {Platform.OS === 'web' && (
            <View style={[styles.noteBox, { backgroundColor: palette.infoSoft }]}>
              <Text style={[styles.note, { color: palette.textSecondary }]}>
                Web-сборка не поддерживает SecureStore — ключ хранится в localStorage браузера. Полная защита
                Keychain/Keystore работает в собранных iOS и Android билдах.
              </Text>
            </View>
          )}
        </Card>

        {enabled && (
          <Button
            title="Сбросить ключ и данные"
            icon="close"
            variant="danger"
            loading={busy}
            onPress={handleReset}
            style={styles.spacer}
          />
        )}
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

function InfoRow({ label, value, palette, accent }) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: palette.divider }]}>
      <Text style={[styles.infoLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: accent || palette.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: space.xl, paddingTop: 16 },
  navRow: { marginBottom: space.md },
  backBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: type.semibold },
  rowDesc: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  infoBox: { borderRadius: 14, padding: space.md, marginTop: space.md },
  infoText: { fontSize: type.label, lineHeight: 20 },
  sectionTitle: { fontSize: type.section, fontWeight: type.semibold, marginBottom: space.sm },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  noteBox: { borderRadius: 14, padding: space.md, marginTop: space.md },
  note: { fontSize: type.caption, lineHeight: 17 },
  spacer: { marginTop: space.md },
});