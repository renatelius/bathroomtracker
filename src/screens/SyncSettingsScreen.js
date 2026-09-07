import React, { useState, useCallback } from 'react';
import {
  View, ScrollView, Text, Switch, StyleSheet, Alert, Platform,
  Modal, TouchableOpacity, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ScreenHeader, Card, Button, TextField, Icon } from '../ui';
import { useThemeColors, type, space, radius, shadow } from '../theme';
import { getSupabaseConfig, setSupabaseConfig, isSupabaseConfigured } from '../services/supabase';
import {
  signUp, signIn, signOut, uploadBackup, restoreFromCloud,
  setSyncEnabled, isSyncEnabled, getLastSyncTime, getCurrentUser, getStoredSyncPassword,
} from '../services/syncService';

/** Подтверждение: на web window.confirm, на native — Alert.alert. */
function confirmAsync(title, message) {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(window.confirm(`${title}\n\n${message}`));
    } else {
      Alert.alert(title, message, [
        { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Продолжить', style: 'destructive', onPress: () => resolve(true) },
      ]);
    }
  });
}

/** Простое уведомление (без кнопок), работает и на web. */
function notify(title, message) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message || ''}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function SyncSettingsScreen() {
  const palette = useThemeColors();
  const navigation = useNavigation();

  const [configured, setConfigured] = useState(null);
  const [cfgUrl, setCfgUrl] = useState('');
  const [cfgAnon, setCfgAnon] = useState('');

  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [syncEnabled, setSyncEnabledState] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [busy, setBusy] = useState(false);

  // Модал запроса пароля шифрования: null | 'enable' | 'backup' | 'restore'
  const [pwGoal, setPwGoal] = useState(null);
  const [pwValue, setPwValue] = useState('');

  const load = useCallback(async () => {
    const isCfg = await isSupabaseConfigured();
    setConfigured(isCfg);
    if (isCfg) {
      const u = await getCurrentUser();
      setUser(u);
      setSyncEnabledState(await isSyncEnabled());
      setLastSync(await getLastSyncTime());
    } else {
      const c = await getSupabaseConfig();
      setCfgUrl(c.url || '');
      setCfgAnon(c.anon || '');
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleSaveConfig() {
    setBusy(true);
    try {
      await setSupabaseConfig({ url: cfgUrl, anon: cfgAnon });
      const ok = await isSupabaseConfigured();
      if (!ok) {
        notify('Не настроено', 'Укажите корректный Project URL и anon key вашего Supabase-проекта.');
        return;
      }
      setConfigured(true);
      setUser(await getCurrentUser());
      setSyncEnabledState(await isSyncEnabled());
      setLastSync(await getLastSyncTime());
      notify('Готово', 'Подключение к Supabase настроено.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp() {
    const em = email.trim().toLowerCase();
    if (!em || !password) {
      notify('Заполните email и пароль');
      return;
    }
    if (password.length < 6) {
      notify('Слабый пароль', 'Пароль должен быть не короче 6 символов.');
      return;
    }
    setBusy(true);
    try {
      const res = await signUp(em, password);
      if (res && res.session) {
        setUser((await getCurrentUser()));
        notify('Аккаунт создан', 'Вы вошли в систему.');
      } else {
        notify('Аккаунт создан', 'Проверьте почту и подтвердите адрес, затем войдите.');
      }
    } catch (e) {
      notify('Ошибка', (e && e.message) || 'Не удалось зарегистрироваться.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignIn() {
    const em = email.trim().toLowerCase();
    if (!em || !password) {
      notify('Заполните email и пароль');
      return;
    }
    setBusy(true);
    try {
      await signIn(em, password);
      setUser(await getCurrentUser());
      notify('Вход выполнен');
    } catch (e) {
      notify('Ошибка', (e && e.message) || 'Не удалось войти.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    const ok = await confirmAsync('Выйти?', 'Автосинхронизация будет отключена, а пароль шифрования удалён с устройства.');
    if (!ok) return;
    setBusy(true);
    try {
      await signOut();
      setUser(null);
      setSyncEnabledState(false);
      setLastSync(null);
      notify('Вы вышли', 'Данные остались локально.');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleSync(value) {
    if (value && !user) {
      notify('Сначала войдите', 'Войдите в аккаунт, чтобы включить синхронизацию.');
      return;
    }
    if (value) {
      setPwValue('');
      setPwGoal('enable');
    } else {
      const ok = await confirmAsync(
        'Отключить синхронизацию?',
        'Автосинхронизация остановится. Бэкап в облаке останется — данные на устройстве не пострадают.'
      );
      if (ok) {
        await setSyncEnabled(false);
        setSyncEnabledState(false);
        notify('Синхронизация отключена');
      }
    }
  }

  async function runBackupWithPassword(pw) {
    if (!pw || !pw.length) {
      notify('Пусто', 'Введите пароль шифрования.');
      return;
    }
    try {
      await uploadBackup(pw);
      setLastSync(await getLastSyncTime());
      notify('✅ Бэкап создан', 'Данные зашифрованы и отправлены в облако.');
    } catch (e) {
      notify('Ошибка бэкапа', (e && e.message) || 'Не удалось создать бэкап.');
    }
  }

  async function handleManualBackup() {
    setBusy(true);
    try {
      const stored = await getStoredSyncPassword();
      if (stored) {
        await runBackupWithPassword(stored);
      } else {
        setPwValue('');
        setPwGoal('backup');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    const ok = await confirmAsync(
      'Восстановить из облака?',
      'Все текущие локальные данные будут заменены бэкапом из облака. Действие необратимо!'
    );
    if (!ok) return;
    setPwValue('');
    setPwGoal('restore');
  }

  async function onPwSubmit() {
    const pw = pwValue;
    const goal = pwGoal;
    setPwGoal(null);
    setBusy(true);
    try {
      if (goal === 'enable') {
        await setSyncEnabled(true, pw);
        setSyncEnabledState(true);
        await runBackupWithPassword(pw);
      } else if (goal === 'backup') {
        await runBackupWithPassword(pw);
        await setSyncEnabled(await isSyncEnabled(), pw); // не трогает флаг, сохраняет пароль
      } else if (goal === 'restore') {
        const backup = await restoreFromCloud(pw);
        setLastSync(backup.updatedAt);
        notify(
          '✅ Данные восстановлены',
          `Бэкап от ${backup.updatedAt ? backup.updatedAt.toLocaleString('ru-RU') : ' (неизвестно)'}. Экран обновится при переходе.`
        );
      }
    } catch (e) {
      notify('Ошибка', (e && e.message) || 'Операция не удалась.');
    } finally {
      setBusy(false);
    }
  }

  function renderBody() {
    if (configured === null) {
      return <Text style={[styles.loading, { color: palette.textMuted }]}>Загрузка…</Text>;
    }

    if (!configured) {
      return (
        <Card>
          <SectionTitle title="1 · Подключение к Supabase" color={palette.textPrimary} />
          <Text style={[styles.rowDesc, { color: palette.textSecondary }]}>
            Вставьте Project URL и anon public key из Supabase → Settings → API.
            Ключи хранятся только на устройстве и не попадают в код приложения.
          </Text>
          <TextField
            label="Project URL"
            value={cfgUrl}
            onChangeText={setCfgUrl}
            placeholder="https://xxxxx.supabase.co"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.field}
          />
          <TextField
            label="Anon public key"
            value={cfgAnon}
            onChangeText={setCfgAnon}
            placeholder="eyJhbGciOiJIUzI1NiIs…"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.field}
          />
          <Button title="Сохранить и продолжить" icon="cloud" loading={busy} onPress={handleSaveConfig} style={styles.spacer} />
        </Card>
      );
    }

    if (!user) {
      return (
        <Card>
          <SectionTitle title="2 · Вход / Регистрация" color={palette.textPrimary} />
          <Text style={[styles.rowDesc, { color: palette.textSecondary }]}>
            Аккаунт нужен, чтобы привязывать бэкап к вашему Supabase-профилю.
          </Text>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.field}
          />
          <TextField
            label="Пароль"
            value={password}
            onChangeText={setPassword}
            placeholder="Минимум 6 символов"
            secureTextEntry
            style={styles.field}
          />
          <View style={styles.buttonRow}>
            <Button title="Регистрация" variant="secondary" onPress={handleSignUp} loading={busy} style={styles.half} />
            <Button title="Войти" onPress={handleSignIn} loading={busy} style={styles.half} />
          </View>
        </Card>
      );
    }

    return (
      <>
        <Card>
          <View style={styles.statusRow}>
            <View style={[styles.iconWrap, { backgroundColor: palette.successSoft }]}>
              <Icon name="cloud" size={20} color={palette.successText} />
            </View>
            <View style={{ flex: 1, paddingHorizontal: space.md }}>
              <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>Авторизован</Text>
              <Text style={[styles.rowDesc, { color: palette.textSecondary }]}>{user.email}</Text>
            </View>
            <Button title="Выйти" variant="danger" loading={busy} onPress={handleSignOut} />
          </View>
        </Card>

        <Card>
          <Row
            icon="cloud"
            title="☁️ Автосинхронизация"
            desc="Бэкап создаётся автоматически после каждого изменения."
            control={
              <Switch
                value={syncEnabled}
                onValueChange={handleToggleSync}
                disabled={busy}
                trackColor={{ false: palette.surfaceAlt, true: palette.accent }}
                thumbColor={palette.surface}
                accessibilityRole="switch"
                accessibilityLabel="Автосинхронизация"
                accessibilityState={{ checked: syncEnabled }}
              />
            }
          />
          {lastSync ? (
            <View style={[styles.lastSyncBox, { backgroundColor: palette.surfaceAlt }]}>
              <Text style={[styles.lastSyncText, { color: palette.textSecondary }]}>Последняя синхронизация:</Text>
              <Text style={[styles.lastSyncTime, { color: palette.textPrimary }]}>
                {lastSync.toLocaleString('ru-RU')}
              </Text>
            </View>
          ) : null}
        </Card>

        <Card>
          <SectionTitle title="🛠 Ручные действия" color={palette.textPrimary} />
          <Button title="Создать бэкап сейчас" icon="check" variant="secondary" loading={busy} onPress={handleManualBackup} style={styles.actionBtn} />
          <Button title="Восстановить из облака" icon="arrowRight" variant="secondary" loading={busy} onPress={handleRestore} style={styles.actionBtn} />
        </Card>
      </>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
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
        <ScreenHeader title="Синхронизация" subtitle="Облачный бэкап с шифрованием" icon="cloud" />

        {renderBody()}

        <View style={[styles.infoBox, { backgroundColor: palette.infoSoft }]}>
          <Text style={[styles.infoText, { color: palette.textPrimary }]}>
            🔐 <Text style={styles.bold}>End-to-End шифрование</Text>{'\n\n'}
            Данные шифруются на вашем устройстве паролем (PBKDF2 + AES-256) перед отправкой.
            Даже серверы Supabase видят только зашифрованный blob. Пароль шифрования
            не совпадает с паролем аккаунта — восстановить данные без него невозможно!
          </Text>
        </View>

        {/* Модал ввода пароля шифрования */}
        <PasswordModal
          visible={pwGoal !== null}
          title={
            pwGoal === 'enable'
              ? '🔐 Придумайте пароль для шифрования'
              : pwGoal === 'restore'
                ? '🔐 Пароль от бэкапа'
                : '🔐 Пароль для шифрования'
          }
          subtitle={
            pwGoal === 'restore'
              ? 'Введите пароль, которым данные были зашифрованы при создании бэкапа.'
              : 'Этот пароль шифрует данные в облаке. Запишите его — восстановление без него невозможно!'
          }
          value={pwValue}
          onChange={setPwValue}
          confirmLabel={pwGoal === 'restore' ? 'Восстановить' : 'Продолжить'}
          onCancel={() => setPwGoal(null)}
          onSubmit={onPwSubmit}
          loading={busy}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title, color }) {
  return <Text style={[styles.sectionTitle, { color }]}>{title}</Text>;
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

function PasswordModal({ visible, title, subtitle, value, onChange, confirmLabel, onCancel, onSubmit, loading }) {
  const palette = useThemeColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Закрыть" />
      <View pointerEvents="box-none" style={styles.host}>
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>{title}</Text>
          <Text style={[styles.modalSub, { color: palette.textSecondary }]}>{subtitle}</Text>
          <TextField
            label="Пароль шифрования"
            value={value}
            onChangeText={onChange}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.field}
          />
          <View style={styles.modalButtons}>
            <Button title="Отмена" variant="secondary" onPress={onCancel} style={styles.half} />
            <Button
              title={confirmLabel || 'Продолжить'}
              icon="check"
              loading={loading}
              onPress={onSubmit}
              style={styles.half}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: space.xl, paddingTop: 16, paddingBottom: 32 },
  loading: { textAlign: 'center', marginTop: 60 },
  navRow: { marginBottom: space.md },
  backBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: type.semibold },
  rowDesc: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  sectionTitle: { fontSize: type.section, fontWeight: type.semibold, marginBottom: space.sm },
  field: { marginTop: space.sm },
  spacer: { marginTop: space.md },
  actionBtn: { marginTop: space.sm },
  buttonRow: { flexDirection: 'row', marginTop: space.sm },
  half: { flex: 1, marginHorizontal: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  lastSyncBox: { borderRadius: 14, padding: space.md, marginTop: space.md },
  lastSyncText: { fontSize: type.caption },
  lastSyncTime: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  infoBox: { borderRadius: 14, padding: space.md, marginTop: space.md },
  infoText: { fontSize: type.caption, lineHeight: 18 },
  bold: { fontWeight: type.bold || '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(28,28,26,0.42)' },
  host: { position: 'absolute', right: 0, left: 0, top: 0, bottom: 0, justifyContent: 'center', padding: space.xl },
  card: {
    borderRadius: radius.xl,
    padding: space.xl,
    ...shadow.sheet,
  },
  modalTitle: { fontSize: 18, fontWeight: type.heavy },
  modalSub: { fontSize: type.caption, marginTop: 4, marginBottom: space.md, lineHeight: 18 },
  modalButtons: { flexDirection: 'row', marginTop: space.sm },
});