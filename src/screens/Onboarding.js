import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveProfile } from '../store/storage';
import { ScreenHeader, Chip, Button, TextField, Icon } from '../ui';
import { useThemeColors, type, space } from '../theme';

const BODY_TYPES = [
  { key: 'asthenic', label: 'Астеник (худощавый)' },
  { key: 'normostenic', label: 'Нормостеник (средний)' },
  { key: 'hypersthenic', label: 'Гиперстеник (плотный)' },
];

const STEPS = [
  { title: 'Добро пожаловать', subtitle: 'Расскажите о себе: эти данные нужны для точного прогноза и никуда не отправляются.', icon: 'profile' },
  { title: 'Рост и вес', subtitle: 'Антропометрия помогает точнее оценивать интервалы и регулярность.', icon: 'list' },
  { title: 'Тип телосложения', subtitle: 'Влияет на интерпретацию норм — ничего не отправляется.', icon: 'profile' },
  { title: 'Готово', subtitle: 'Проверьте данные — их всегда можно изменить позже в профиле.', icon: 'check' },
];

export default function Onboarding({ onDone }) {
  const palette = useThemeColors();
  const [step, setStep] = useState(0);
  const [sex, setSex] = useState(null);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [bodyType, setBodyType] = useState(null);

  const stepValid =
    step === 0
      ? Boolean(sex)
      : step === 1
        ? parseFloat(heightCm) > 0 && parseFloat(weightKg) > 0 && birthYear.trim() !== ''
        : step === 2
          ? Boolean(bodyType)
          : true;

  function goTo(next) {
    setStep(Math.max(0, Math.min(STEPS.length - 1, next)));
  }

  async function handleSave() {
    const profile = {
      sex,
      heightCm: parseFloat(heightCm),
      weightKg: parseFloat(weightKg),
      birthYear: parseInt(birthYear, 10),
      bodyType,
    };
    await saveProfile(profile);
    onDone(profile);
  }

  const current = STEPS[step];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Прогресс-бар по шагам */}
        <View style={styles.progressWrap}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.progressTrack, i <= step && { backgroundColor: palette.accent }]} />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader title={current.title} subtitle={current.subtitle} icon={current.icon} />

          {step === 0 && (
            <View>
              <Text style={[styles.stepLabel, { color: palette.textSecondary }]}>Пол</Text>
              <Text style={[styles.helper, { color: palette.textMuted }]}>
                Учитывается при расчёте прогноза. Выберите один вариант.
              </Text>
              <View style={styles.row}>
                <Chip label="Мужской" active={sex === 'male'} onPress={() => setSex('male')} style={styles.flexChip} />
                <Chip label="Женский" active={sex === 'female'} onPress={() => setSex('female')} style={styles.flexChip} />
              </View>
            </View>
          )}

          {step === 1 && (
            <View>
              <TextField
                label="Рост, см"
                keyboardType="numeric"
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="Например 175"
              />
              <TextField
                label="Вес, кг"
                keyboardType="numeric"
                value={weightKg}
                onChangeText={setWeightKg}
                placeholder="Например 70"
              />
              <TextField
                label="Год рождения"
                keyboardType="numeric"
                value={birthYear}
                onChangeText={setBirthYear}
                placeholder="Например 1990"
              />
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={[styles.stepLabel, { color: palette.textSecondary }]}>Тип телосложения</Text>
              <Text style={[styles.helper, { color: palette.textMuted }]}>
                Выберите, что вам ближе всего. Никакие данные не покидают устройство.
              </Text>
              {BODY_TYPES.map((b) => (
                <TouchableChip key={b.key} active={bodyType === b.key} onPress={() => setBodyType(b.key)}>
                  {b.label}
                </TouchableChip>
              ))}
            </View>
          )}

          {step === 3 && (
            <View style={styles.summary}>
              <SummaryRow label="Пол" value={sex === 'male' ? 'Мужской' : 'Женский'} />
              <SummaryRow label="Рост" value={`${heightCm} см`} />
              <SummaryRow label="Вес" value={`${weightKg} кг`} />
              <SummaryRow label="Год рождения" value={birthYear} />
              <SummaryRow label="Телосложение" value={BODY_TYPES.find((b) => b.key === bodyType)?.label} />
            </View>
          )}

          {/* Навигация по шагам */}
          <View style={styles.nav}>
            {step > 0 && (
              <Button variant="secondary" title="Назад" icon="arrowLeft" onPress={() => goTo(step - 1)} style={styles.navBack} />
            )}
            {step < STEPS.length - 1 ? (
              <Button
                title="Далее"
                icon="check"
                disabled={!stepValid}
                onPress={() => goTo(step + 1)}
                style={[styles.navNext, step === 0 && styles.navNextFull]}
              />
            ) : (
              <Button title="Завершить" icon="check" onPress={handleSave} style={styles.navNext} />
            )}
          </View>
          {step < STEPS.length - 1 && !stepValid && (
            <Text style={[styles.hint, { color: palette.textMuted }]}>
              {step === 0
                ? 'Выберите пол, чтобы продолжить.'
                : step === 1
                  ? 'Заполните рост, вес и год рождения.'
                  : 'Выберите тип телосложения.'}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }) {
  const palette = useThemeColors();
  return (
    <View style={[styles.summaryRow, { borderBottomColor: palette.divider }]}>
      <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{value}</Text>
    </View>
  );
}

function TouchableChip({ active, onPress, children }) {
  const palette = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.chipFull,
        active
          ? { backgroundColor: palette.infoSoft, borderColor: palette.info }
          : { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={typeof children === 'string' ? children : undefined}
    >
      <View style={styles.chipFullInner}>
        <Text style={[styles.chipFullText, active && { color: palette.textPrimary, fontWeight: type.semibold }]}>
          {children}
        </Text>
        {active && <Icon name="check" size={18} color={palette.info} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: space.xl, paddingTop: 20 },
  progressWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: 4,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  stepLabel: {
    fontSize: type.label,
    fontWeight: type.semibold,
    marginTop: space.md,
    marginBottom: space.sm,
  },
  helper: { fontSize: type.caption, marginBottom: space.sm },
  row: { flexDirection: 'row', gap: 12 },
  flexChip: { flex: 1 },
  chipFull: {
    marginBottom: space.sm,
    paddingVertical: space.md,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  chipFullInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipFullText: { fontSize: type.body },
  summary: { marginTop: space.sm },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryLabel: { fontSize: type.body },
  summaryValue: { fontSize: type.body, fontWeight: type.semibold },
  nav: { flexDirection: 'row', gap: 12, marginTop: space.xxl },
  navBack: { flex: 0.45 },
  navNext: { flex: 1 },
  navNextFull: { flex: 1 },
  hint: { textAlign: 'center', fontSize: type.caption, marginTop: space.sm },
});
