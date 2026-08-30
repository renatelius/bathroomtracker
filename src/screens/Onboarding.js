import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { saveProfile } from '../store/storage';

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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Добро пожаловать</Text>
        <Text style={styles.subtitle}>
          Заполните данные — они нужны для точного прогноза дефекации.
        </Text>

        <Text style={styles.label}>Пол</Text>
        <View style={styles.row}>
          {['male', 'female'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, sex === s && styles.chipActive]}
              onPress={() => setSex(s)}
            >
              <Text style={[styles.chipText, sex === s && styles.chipTextActive]}>
                {s === 'male' ? 'Мужской' : 'Женский'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Рост, см</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={heightCm}
          onChangeText={setHeightCm}
          placeholder="Например 175"
        />

        <Text style={styles.label}>Вес, кг</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={weightKg}
          onChangeText={setWeightKg}
          placeholder="Например 70"
        />

        <Text style={styles.label}>Год рождения</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={birthYear}
          onChangeText={setBirthYear}
          placeholder="Например 1990"
        />

        <Text style={styles.label}>Тип телосложения</Text>
        {BODY_TYPES.map((b) => (
          <TouchableOpacity
            key={b.key}
            style={[styles.chipFull, bodyType === b.key && styles.chipActive]}
            onPress={() => setBodyType(b.key)}
          >
            <Text style={[styles.chipText, bodyType === b.key && styles.chipTextActive]}>
              {b.label}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.button, !ready && styles.buttonDisabled]}
          disabled={!ready}
          onPress={handleSave}
        >
          <Text style={styles.buttonText}>Готово</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f5f7fb' },
  container: { padding: 24, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 15, color: '#555', marginTop: 6, marginBottom: 24 },
  label: { fontSize: 13, color: '#666', marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  chip: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  chipFull: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  chipActive: { borderColor: '#2f6fed', backgroundColor: '#eaf1ff' },
  chipText: { fontSize: 15, color: '#333' },
  chipTextActive: { color: '#2f6fed', fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  button: {
    marginTop: 28,
    backgroundColor: '#2f6fed',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
