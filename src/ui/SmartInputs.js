/**
 * SmartInputs — «тактильные» селекторы: нажал поле → bottom-sheet со списком.
 * Замена «голых» числовых TextField в антропометрии и категориях.
 * Работает в стиле дизайн-системы и сам адаптируется к палитре (ауре).
 */
import React, { useState, useCallback } from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, radius, type, space } from '../theme';
import Icon from './Icon';

// ---------------- Наборы вариантов ----------------

/** Вес, 30–150 кг включительно. Значение — строка вида «70 кг». */
export const WEIGHT_OPTIONS = Array.from({ length: 121 }, (_, i) => `${i + 30} кг`);

/** Рост, 120–220 см включительно. Значение — строка вида «170 см». */
export const HEIGHT_OPTIONS = Array.from({ length: 101 }, (_, i) => `${i + 120} см`);

/** Годы рождения: от текущего вниз на 100 лет. Значение — строка «1990». */
export const YEAR_OPTIONS = (() => {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current; y >= current - 99; y--) years.push(`${y}`);
  return years;
})();

/** Категории приёма пищи. */
export const MEAL_CATEGORIES = ['Завтрак', 'Обед', 'Ужин', 'Перекус', 'Десерт', 'Напиток', 'Другое'];

// ---------------- Компонент ----------------

/**
 * Поле-селектор, открывающее модальный список для одного выбора.
 *
 * @param {string} [label] - подпись над полем (как у TextField)
 * @param {string} [placeholder] - текст, когда значение не выбрано
 * @param {string} value - отображаемое значение (пустая строка = не выбрано)
 * @param {(string[]|{value:string,label:string,emoji?:string}[])} options
 * @param {(value:string, label:string)=>void} onSelect - вызывается с выбранным значением
 */
export default function SmartSelector({
  label,
  placeholder = 'Выберите…',
  value,
  options = [],
  onSelect,
  style,
  icon,
}) {
  const palette = useThemeColors();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  const displayLabel = useCallback(
    (opt) => {
      if (typeof opt === 'string') return opt;
      return opt ? opt.label : '';
    },
    []
  );

  const handleSelect = useCallback(
    (opt) => {
      if (typeof opt === 'string') {
        onSelect(opt, opt);
      } else if (opt) {
        onSelect(opt.value != null ? opt.value : opt.label, opt.label);
      }
      setVisible(false);
    },
    [onSelect]
  );

  const hasValue = typeof value === 'string' && value.trim().length > 0;

  return (
    <>
      <View style={[styles.field, style]}>
        {label ? <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text> : null}
        <TouchableOpacity
          style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={() => setVisible(true)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={label || placeholder}
          accessibilityHint={`Открыть выбор: ${hasValue ? value : placeholder}`}
        >
          {icon ? <Icon name={icon} size={17} color={palette.textMuted} /> : null}
          <Text
            style={[
              styles.inputText,
              { color: hasValue ? palette.textPrimary : palette.textMuted },
            ]}
            numberOfLines={1}
          >
            {hasValue ? value : placeholder}
          </Text>
          <Icon name="chevronDown" size={16} color={palette.textMuted} />
        </TouchableOpacity>
      </View>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        {Platform.OS !== 'web' ? <StatusBar backgroundColor={palette.overlay} /> : null}
        <View style={[styles.backdrop, { backgroundColor: palette.overlay }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} activeOpacity={1} accessibilityLabel="Закрыть" />
          <View style={[styles.sheet, { backgroundColor: palette.surface, paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={[styles.handle, { backgroundColor: palette.border }]} />
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: palette.textPrimary }]}>
                {label || placeholder}
              </Text>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                hitSlop={12}
                style={[styles.closeBtn, { backgroundColor: palette.surfaceAlt }]}
                accessibilityRole="button"
                accessibilityLabel="Закрыть"
              >
                <Icon name="close" size={16} color={palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(opt, i) => (typeof opt === 'string' ? opt : opt.value || String(i))}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              initialNumToRender={40}
              renderItem={({ item }) => {
                const itemValue = typeof item === 'string' ? item : item.value;
                const isActive = value === itemValue;
                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      isActive && { backgroundColor: palette.accentSoft, borderColor: palette.accent },
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.75}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={displayLabel(item)}
                  >
                    {typeof item === 'object' && item.emoji ? (
                      <Text style={styles.optionEmoji}>{item.emoji}</Text>
                    ) : null}
                    <Text
                      style={[
                        styles.optionText,
                        { color: isActive ? palette.accent : palette.textPrimary },
                        isActive && { fontWeight: type.semibold },
                      ]}
                    >
                      {displayLabel(item)}
                    </Text>
                    {isActive ? <Icon name="check" size={18} color={palette.accent} /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: space.md },
  label: { fontSize: type.label, fontWeight: type.semibold, marginBottom: space.sm },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: space.lg,
  },
  inputText: { flex: 1, fontSize: type.body },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    width: 32,
    height: 4,
    borderRadius: radius.pill,
    marginBottom: space.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  title: { fontSize: type.title, fontWeight: type.heavy, flexShrink: 1 },
  closeBtn: {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { marginTop: space.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionEmoji: { fontSize: 18, marginRight: space.sm },
  optionText: { flex: 1, fontSize: type.body },
});