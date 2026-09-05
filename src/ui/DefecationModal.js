import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BristolScale, ComfortPicker } from './BristolPicker';
import Button from './Button';
import { useThemeColors, type, space, radius, shadow } from '../theme';

/**
 * Модалка «Новая дефекация»: время + Бристоль (1-7) + комфорт (1-5).
 * Кнопка «Записать» — сохраняет с деталями; «Без деталей» — мгновенно, как раньше.
 */
export default function DefecationModal({ visible, onClose, onSave }) {
  const palette = useThemeColors();
  const [bristol, setBristol] = useState(null);
  const [comfort, setComfort] = useState(null);

  function reset() {
    setBristol(null);
    setComfort(null);
  }

  function close() {
    reset();
    onClose();
  }

  function save() {
    onSave({ bristol, comfort });
    close();
  }

  function savePlain() {
    onSave({ bristol: null, comfort: null });
    close();
  }

  const now = new Date();
  const timeText = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Закрыть" />
      <View pointerEvents="box-none" style={styles.host}>
        <ScrollView
          contentContainerStyle={[styles.sheetWrap, { borderRadius: radius.xl, backgroundColor: palette.surface }]}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient colors={palette.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Новая дефекация</Text>
                <Text style={styles.headerTime}>сейчас, ~{timeText}</Text>
              </View>
              <Pressable
                onPress={close}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Закрыть"
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
          </LinearGradient>

          <View style={styles.body}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>
              Тип по Бристольской шкале
            </Text>
            <BristolScale value={bristol} onChange={setBristol} />

            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Комфорт</Text>
            <ComfortPicker value={comfort} onChange={setComfort} />

            <View style={styles.actions}>
              <Button title="Записать" icon="check" onPress={save} style={styles.primaryBtn} />
              <Button title="Без деталей" icon="check" variant="ghost" onPress={savePlain} style={styles.skipBtn} />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.42)' },
  host: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheetWrap: { ...shadow.sheet },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  headerTitle: { fontSize: type.title, fontWeight: type.heavy, color: '#FFFFFF' },
  headerTime: { fontSize: type.label, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  body: { padding: space.xl },
  sectionLabel: { fontSize: type.label, fontWeight: type.semibold, marginBottom: space.md, marginTop: space.md },
  actions: { marginTop: space.xl, alignItems: 'center' },
  primaryBtn: { alignSelf: 'stretch' },
  skipBtn: { marginTop: space.sm, alignSelf: 'stretch' },
});