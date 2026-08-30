import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveProfile } from '../store/storage';
import { ScreenHeader, Chip, Button, TextField, Card, Icon } from '../ui';
import { palette, type, space } from '../theme';

const BODY_TYPES = [
  { key: 'asthenic', label: 'Астеник (худощавый)' },
  { key: 'normostenic', label: 'Нормостеник (средний)' },
  { key: 'hypersthenic', label: 'Гиперстеник (плотный)' },
];

export default function Onboarding({ onDone }) {
  const [sex, setSex] = useState(null);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [bodyType, setBodyType] = useState(null);

  const ready =
    sex &&
    parseFloat(heightCm) > 0 &&
    parseFloat(weightKg) > 0 &&
    birthYear.trim() &&
    bodyType;

  async function handleSave() {
    if (!ready) return;
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

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <ScreenHeader
            title="Добро пожаловать"
            subtitle="Эти данные нужны для точного прогноза. Никуда не отправляются."
            icon="profile"
          />

          <Text style={styles.stepLabel}>Пол</Text>
          <View style={styles.row}>
            <Chip label="Мужской" active={sex === 'male'} onPress={() => setSex('male')} style={styles.flexChip} />
            <Chip label="Женский" active={sex === 'female'} onPress={() => setSex('female')} style={styles.flexChip} />
          </View>

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

          <Text style={styles.stepLabel}>Тип телосложения</Text>
          {BODY_TYPES.map((b) => (
            <TouchableChip key={b.key} active={bodyType === b.key} onPress={() => setBodyType(b.key)}>
              {b.label}
            </TouchableChip>
          ))}

          <Button title="Готово" disabled={!ready} onPress={handleSave} style={styles.button} />
          {!ready && (
            <Text style={styles.hint}>Заполните все поля, чтобы продолжить.</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TouchableChip({ active, onPress, children }) {
  return (
    <Card
      tone={active ? 'info' : 'default'}
      style={styles.chipFull}
    >
      <View
        style={styles.chipFullInner}
        accessibilityRole="button"
      >
        <Text style={[styles.chipFullText, active && { color: palette.accent, fontWeight: type.semibold }]}>
          {children}
        </Text>
        {active && <Icon name="check" size={18} color={palette.accent} />}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.bg },
  container: { padding: space.xl, paddingTop: 28 },
  stepLabel: {
    fontSize: type.label,
    fontWeight: type.semibold,
    color: palette.textSecondary,
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  row: { flexDirection: 'row', gap: 12 },
  flexChip: { flex: 1 },
  chipFull: { marginBottom: space.sm, paddingVertical: space.md },
  chipFullInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipFullText: { fontSize: type.body, color: palette.textPrimary },
  button: { marginTop: space.xxl },
  hint: { textAlign: 'center', color: palette.textMuted, fontSize: type.caption, marginTop: space.sm },
});
