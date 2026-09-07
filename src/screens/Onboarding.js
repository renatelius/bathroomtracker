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
import { ScreenHeader, Chip, Button, Icon, Illustration, SmartSelector, WEIGHT_OPTIONS, HEIGHT_OPTIONS, YEAR_OPTIONS } from '../ui';
import { useThemeColors, type, space, radius } from '../theme';

const PROMOS = [
  {
    variant: 'leaf',
    kicker: 'Спокойствие',
    title: 'Наблюдайте за своим ритмом',
    subtitle:
      'Отмечайте визиты — и приложение покажет, когда вероятнее всего заглянуть снова. Данные хранятся только на устройстве.',
  },
  {
    variant: 'chart',
    kicker: 'Ясность',
    title: 'Увидьте свой ритм недели',
    subtitle:
      'Карта активности и статистика подсвечивают закономерности — регулярность, серии и распределение по Бристольской шкале.',
  },
  {
    variant: 'drop',
    kicker: 'Предсказуемость',
    title: 'Прогноз с напоминанием',
    subtitle:
      'Получайте мягкое уведомление в вероятное время или настраивайте оповещение под себя.',
  },
];

const BODY_TYPES = [
  { key: 'asthenic', label: 'Астеник (худощавый)' },
  { key: 'normostenic', label: 'Нормостеник (средний)' },
  { key: 'hypersthenic', label: 'Гиперстеник (плотный)' },
];

const STEPS = [
  { title: 'О себе', subtitle: 'Расскажите о себе: эти данные нужны для точного прогноза и никуда не отправляются.', icon: 'profile' },
  { title: 'Рост и вес', subtitle: 'Антропометрия помогает точнее оценивать интервалы и регулярность.', icon: 'list' },
  { title: 'Тип телосложения', subtitle: 'Влияет на интерпретацию норм — ничего не отправляется.', icon: 'profile' },
  { title: 'Готово', subtitle: 'Проверьте данные — их всегда можно изменить позже в профиле.', icon: 'check' },
];

export default function Onboarding({ onDone }) {
  const palette = useThemeColors();
  const [promo, setPromo] = useState(0); // 0..PROMOS.length-1, null -> профиль
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

  if (promo !== null) {
    const p = PROMOS[promo];
    const last = promo === PROMOS.length - 1;
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
        <View style={styles.promoHeader}>
          <TouchableOpacity
            onPress={() => setPromo(null)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Пропустить введение"
          >
            <Text style={[styles.promoSkip, { color: palette.textSecondary }]}>Пропустить</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.promoBody}>
          <View style={[styles.promoArt, { backgroundColor: palette.accentSoft }]}>
            <Illustration variant={p.variant} palette={palette} size={210} />
          </View>
          <Text style={[styles.promoKicker, { color: palette.accent }]}>{p.kicker}</Text>
          <Text style={[styles.promoTitle, { color: palette.textPrimary }]}>{p.title}</Text>
          <Text style={[styles.promoSubtitle, { color: palette.textSecondary }]}>{p.subtitle}</Text>

          <View style={styles.promoDots} accessibilityLabel={`Шаг ${promo + 1} из ${PROMOS.length}`}>
            {PROMOS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.promoDot,
                  i === promo ? { backgroundColor: palette.accent, width: 22 } : { backgroundColor: palette.accentSoft },
                ]}
              />
            ))}
          </View>

          <Button
            title={last ? 'Начать' : 'Далее'}
            icon="check"
            onPress={() => (last ? setPromo(null) : setPromo(promo + 1))}
            style={styles.promoCta}
          />
        </View>
      </SafeAreaView>
    );
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
              <SmartSelector
                label="Рост, см"
                placeholder="Выберите рост"
                value={heightCm ? `${heightCm} см` : ''}
                options={HEIGHT_OPTIONS}
                onSelect={(v) => setHeightCm(String(parseInt(v, 10) || ''))}
                icon="profile"
              />
              <SmartSelector
                label="Вес, кг"
                placeholder="Выберите вес"
                value={weightKg ? `${weightKg} кг` : ''}
                options={WEIGHT_OPTIONS}
                onSelect={(v) => setWeightKg(String(parseInt(v, 10) || ''))}
              />
              <SmartSelector
                label="Год рождения"
                placeholder="Выберите год"
                value={birthYear}
                options={YEAR_OPTIONS}
                onSelect={(v) => setBirthYear(String(parseInt(v, 10) || ''))}
                icon="calendar"
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

  promoHeader: { alignItems: 'flex-end', paddingHorizontal: space.xl, paddingTop: space.lg },
  promoSkip: { fontSize: type.body, fontWeight: '600', paddingVertical: 6, paddingHorizontal: 8 },
  promoBody: { flex: 1, justifyContent: 'center', paddingHorizontal: space.xl, paddingBottom: space.xl },
  promoArt: {
    alignSelf: 'center',
    width: 272,
    height: 224,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xxl,
  },
  promoKicker: {
    fontSize: type.label,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  promoTitle: { fontSize: type.hero, fontWeight: type.heavy, textAlign: 'center', marginTop: space.sm, letterSpacing: -0.6 },
  promoSubtitle: {
    fontSize: type.body,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: space.md,
    paddingHorizontal: space.sm,
  },
  promoDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: space.xxl,
    marginBottom: space.xl,
  },
  promoDot: { height: 8, borderRadius: 4 },
  promoCta: { alignSelf: 'stretch' },

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
    borderRadius: radius.md,
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
