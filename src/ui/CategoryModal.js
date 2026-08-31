import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, radius, type, space } from '../theme';
import Icon from './Icon';

/**
 * Модальное окно-«категории» (bottom sheet).
 * Позволяет выбрать несколько категорий из списка и «Выбрать все».
 *
 * @param {boolean} visible
 * @param {string} title - заголовок, напр. «Категории» (счётчик добавится)
 * @param {{id:string,label:string, icon?:string}[]} categories
 * @param {string[]} selected - выбранные id
 * @param {(selected:string[])=>void} onChange - вызывается при каждом тапе
 * @param {()=>void} onClose - закрыть без сохранения
 * @param {()=>void} onApply - подтвердить (обычно закрывает)
 */
export default function CategoryModal({
  visible,
  title = 'Категории',
  categories = [],
  selected = [],
  onChange,
  onClose,
  onApply,
}) {
  const palette = useThemeColors();
  const insets = useSafeAreaInsets();

  const allSelected = categories.length > 0 && selected.length === categories.length;
  const someSelected = selected.length > 0;

  function toggle(id) {
    const has = selected.includes(id);
    const next = has ? selected.filter((x) => x !== id) : [...selected, id];
    onChange(next);
  }

  function toggleAll() {
    onChange(allSelected ? [] : categories.map((c) => c.id));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {Platform.OS !== 'web' ? <StatusBar backgroundColor={palette.overlay} /> : null}
      <View style={[styles.backdrop, { backgroundColor: palette.overlay }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} accessibilityLabel="Закрыть" />

        <View style={[styles.sheet, { backgroundColor: palette.surface, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={[styles.handle, { backgroundColor: palette.border }]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: palette.textPrimary }]}>{title}</Text>
            <View style={[styles.count, { backgroundColor: palette.accentSoft }]}>
              <Text style={[styles.countText, { color: palette.accent }]}>
                {selected.length}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              style={[styles.closeBtn, { backgroundColor: palette.surfaceAlt }]}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
            >
              <Icon name="close" size={16} color={palette.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.selectAllRow}
            onPress={toggleAll}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: allSelected }}
            accessibilityLabel={allSelected ? 'Убрать выбор всех категорий' : 'Выбрать все категории'}
          >
            <View style={[styles.checkbox, { borderColor: palette.accent }, allSelected && { backgroundColor: palette.accent }]}>
              {allSelected ? <Icon name="check" size={14} color={palette.textOnAccent} /> : null}
            </View>
            <Text style={[styles.selectAllText, { color: palette.textPrimary }]}>
              {allSelected ? 'Снять выбор' : 'Выбрать все'}
            </Text>
            {someSelected ? (
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                {allSelected ? 'всё выбрано' : 'выбрано частично'}
              </Text>
            ) : null}
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: palette.divider }]} />

          <View style={styles.chips}>
            {categories.map((c) => {
              const active = selected.includes(c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => toggle(c.id)}
                  activeOpacity={0.8}
                  style={[
                    styles.chip,
                    { borderColor: active ? palette.accent : palette.border },
                    { backgroundColor: active ? palette.accent : palette.surface },
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={c.label}
                >
                  {c.icon ? <Icon name={c.icon} size={15} color={active ? palette.textOnAccent : palette.textSecondary} /> : null}
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? palette.textOnAccent : palette.textPrimary },
                    ]}
                  >
                    {c.label}
                  </Text>
                  {active ? <Icon name="check" size={13} color={palette.textOnAccent} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.apply, { backgroundColor: palette.accent }]}
            onPress={onApply}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Применить"
          >
            <Text style={[styles.applyText, { color: palette.textOnAccent }]}>
              Применить{selected.length ? ` (${selected.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    marginBottom: space.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  title: { fontSize: type.title, fontWeight: type.heavy, flexShrink: 1 },
  count: {
    marginLeft: space.sm,
    minWidth: 26,
    height: 26,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: type.label, fontWeight: type.semibold },
  closeBtn: {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    marginTop: space.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectAllText: { marginLeft: space.sm, fontSize: type.body, fontWeight: type.semibold, flexShrink: 1 },
  meta: { marginLeft: 'auto', fontSize: type.caption },
  divider: { height: StyleSheet.hairlineWidth },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
    minHeight: 40,
  },
  chipText: { marginHorizontal: 6, fontSize: type.body, fontWeight: type.medium },
  apply: {
    marginTop: space.lg,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { fontSize: type.body, fontWeight: type.semibold },
});
