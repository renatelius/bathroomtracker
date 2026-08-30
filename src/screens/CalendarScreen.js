import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { predict } from '../model/model.mjs';
import { getProfile, getDefecations, getMeals } from '../store/storage';
import { schedulePrediction, cancelPrediction, ensurePermissions } from '../services/notifications';
import { getSettings } from '../store/storage';
import { palette, type, space } from '../theme';
import { ScreenHeader, Card, Button, Icon } from '../ui';

LocaleConfig.locales['ru'] = {
  monthNames: [
    'РЇРЅРІР°СЂСЊ', 'Р¤РµРІСЂР°Р»СЊ', 'РњР°СЂС‚', 'РђРїСЂРµР»СЊ', 'РњР°Р№', 'РСЋРЅСЊ',
    'РСЋР»СЊ', 'РђРІРіСѓСЃС‚', 'РЎРµРЅС‚СЏР±СЂСЊ', 'РћРєС‚СЏР±СЂСЊ', 'РќРѕСЏР±СЂСЊ', 'Р”РµРєР°Р±СЂСЊ',
  ],
  monthNamesShort: [
    'РЇРЅРІ', 'Р¤РµРІ', 'РњР°СЂ', 'РђРїСЂ', 'РњР°Р№', 'РСЋРЅ',
    'РСЋР»', 'РђРІРі', 'РЎРµРЅ', 'РћРєС‚', 'РќРѕСЏ', 'Р”РµРє',
  ],
  dayNames: ['Р’РѕСЃРєСЂРµСЃРµРЅСЊРµ', 'РџРѕРЅРµРґРµР»СЊРЅРёРє', 'Р’С‚РѕСЂРЅРёРє', 'РЎСЂРµРґР°', 'Р§РµС‚РІРµСЂРі', 'РџСЏС‚РЅРёС†Р°', 'РЎСѓР±Р±РѕС‚Р°'],
  dayNamesShort: ['Р’СЃ', 'РџРЅ', 'Р’С‚', 'РЎСЂ', 'Р§С‚', 'РџС‚', 'РЎР±'],
  today: 'РЎРµРіРѕРґРЅСЏ',
};
LocaleConfig.defaultLocale = 'ru';

const todayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const dayKey = (ms) => {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export default function CalendarScreen() {
  const [marked, setMarked] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const profile = await getProfile();
    const defecations = await getDefecations();
    const meals = await getMeals();
    const p = predict({ defecations, meals, profile, nowMs: Date.now() });
    setPrediction(p);

    const marks = {};

    // Р”РЅРё СЃ РґРµС„РµРєР°С†РёСЏРјРё вЂ” СЃРёРЅСЏСЏ С‚РѕС‡РєР°
    defecations.forEach((d) => {
      const k = dayKey(d.timeMs);
      marks[k] = marks[k] || {};
      marks[k].dots = marks[k].dots || [];
      marks[k].dots.push({ key: 'def', color: '#27ae60' });
    });
    // Р”РЅРё СЃ РµРґРѕР№ вЂ” РѕСЂР°РЅР¶РµРІР°СЏ С‚РѕС‡РєР°
    meals.forEach((m) => {
      const k = dayKey(m.timeMs);
      marks[k] = marks[k] || {};
      marks[k].dots = marks[k].dots || [];
      marks[k].dots.push({ key: 'meal', color: '#f39c12' });
    });

    // РћРєРЅРѕ РґРѕСЃС‚РѕРІРµСЂРЅРѕСЃС‚Рё low..high вЂ” РјСЏРіРєР°СЏ РїРѕРґСЃРІРµС‚РєР° РґРёР°РїР°Р·РѕРЅР° (РєСЂРѕРјРµ РїСЂРѕРіРЅРѕР·Р°)
    const today = todayStr();
    const lowKey = dayKey(p.lowMs);
    const highKey = dayKey(p.highMs);
    let cursor = new Date(p.lowMs);
    cursor.setHours(0, 0, 0, 0);
    const high = new Date(p.highMs);
    high.setHours(0, 0, 0, 0);
    while (cursor <= high) {
      const k = dayKey(cursor.getTime());
      if (k >= lowKey && k <= highKey && k !== dayKey(p.predictedAtMs)) {
        marks[k] = marks[k] || {};
        marks[k].customStyles = {
          container: { backgroundColor: palette.accentSoft, borderRadius: 100 },
        };
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    // Р”РµРЅСЊ РїСЂРѕРіРЅРѕР·Р° вЂ” Р°РєС†РµРЅС‚РЅС‹Р№
    const pKey = dayKey(p.predictedAtMs);
    marks[pKey] = marks[pKey] || {};
    marks[pKey].customStyles = {
      container: {
        backgroundColor: palette.accent,
        borderRadius: 100,
      },
      text: { color: palette.textOnAccent, fontWeight: '700' },
    };
    marks[pKey].selected = true;

    // РЎРµРіРѕРґРЅСЏ вЂ” СЂР°РјРєР°
    marks[today] = marks[today] || {};
    marks[today].customStyles = marks[today].customStyles || {};
    marks[today].customStyles.container = {
      ...(marks[today].customStyles.container || {}),
      borderWidth: 1,
      borderColor: palette.accent,
    };

    setMarked(marks);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onSetAlarm() {
    setBusy(true);
    try {
      if (!prediction) {
        Alert.alert('РќРµС‚ РїСЂРѕРіРЅРѕР·Р°', 'РЎРЅР°С‡Р°Р»Р° СЃРѕР±РµСЂРёС‚Рµ С‡СѓС‚СЊ Р±РѕР»СЊС€Рµ Р·Р°РїРёСЃРµР№.');
        return;
      }
      const { granted } = await ensurePermissions();
      if (!granted) {
        Alert.alert(
          'РќРµС‚ РґРѕСЃС‚СѓРїР° Рє СѓРІРµРґРѕРјР»РµРЅРёСЏРј',
          'Р Р°Р·СЂРµС€РёС‚Рµ СѓРІРµРґРѕРјР»РµРЅРёСЏ РІ РЅР°СЃС‚СЂРѕР№РєР°С…, С‡С‚РѕР±С‹ Р±СѓРґРёР»СЊРЅРёРє СЂР°Р±РѕС‚Р°Р».'
        );
        return;
      }
      const settings = await getSettings();
      const when = new Date(prediction.predictedAtMs);
      await cancelPrediction();
      await schedulePrediction({
        predictedAtMs: prediction.predictedAtMs,
        leadMinutes: settings.alarmLeadMinutes,
        title: 'РџСЂРѕРіРЅРѕР· РґРµС„РµРєР°С†РёРё',
        body: `РџРѕ СЂР°СЃС‡С‘С‚Р°Рј вЂ” РїСЂРёРјРµСЂРЅРѕ ${when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}.`,
      });
      Alert.alert('Р“РѕС‚РѕРІРѕ', `РќР°РїРѕРјРёРЅР°РЅРёРµ СѓСЃС‚Р°РЅРѕРІР»РµРЅРѕ РЅР° ${when.toLocaleDateString('ru-RU')} ~${when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}.`);
    } catch (e) {
      Alert.alert('РћС€РёР±РєР°', e.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ СѓСЃС‚Р°РЅРѕРІРёС‚СЊ РЅР°РїРѕРјРёРЅР°РЅРёРµ');
    } finally {
      setBusy(false);
    }
  }

  const when = prediction
    ? new Date(prediction.predictedAtMs)
    : null;

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView>
        <View style={styles.header}>
          <ScreenHeader title="РљР°Р»РµРЅРґР°СЂСЊ" subtitle="РџСЂРѕРіРЅРѕР· Рё Р·Р°РїРёСЃРё" icon="calendar" />
        </View>

        <Calendar
          markingType="custom"
          markedDates={marked}
          current={todayStr()}
          theme={{
            selectedDayBackgroundColor: palette.accent,
            todayTextColor: palette.accent,
            arrowColor: palette.accent,
            textDayFontSize: 14,
            textMonthFontWeight: '700',
            textDayHeaderFontSize: 12,
            textSectionTitlecolor: palette.textMuted,
          }}
        />

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#27ae60' }]} />
            <Text style={styles.legendText}>Р”РµС„РµРєР°С†РёСЏ</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#f39c12' }]} />
            <Text style={styles.legendText}>РџСЂРёС‘Рј РїРёС‰Рё</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: palette.accent }]} />
            <Text style={styles.legendText}>РџСЂРѕРіРЅРѕР·</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.windowSwatch} />
            <Text style={styles.legendText}>РћРєРЅРѕ РґРѕСЃС‚РѕРІРµСЂРЅРѕСЃС‚Рё</Text>
          </View>
        </View>

        {prediction && (
          <View style={styles.predictionCard}>
            <Text style={styles.cardLabel}>РџСЂРѕРіРЅРѕР· СЃР»РµРґСѓСЋС‰РµР№ РґРµС„РµРєР°С†РёРё</Text>
            <Text style={styles.cardDate}>
              {when.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Text style={styles.cardTime}>
              ~{when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.cardRange}>
              РѕРєРЅРѕ: {new Date(prediction.lowMs).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} вЂ”{' '}
              {new Date(prediction.highMs).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </Text>
            <TouchableOpacity
              style={[styles.alarmBtn, busy && { opacity: 0.6 }]}
              onPress={onSetAlarm}
              disabled={busy}
            >
              <Text style={styles.alarmBtnText}>рџ”” РџРѕСЃС‚Р°РІРёС‚СЊ РЅР°РїРѕРјРёРЅР°РЅРёРµ</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: palette.textPrimary },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  windowSwatch: { width: 16, height: 10, borderRadius: 3, backgroundColor: palette.accentSoft, marginRight: 6 },
  legendText: { fontSize: 12, color: palette.textSecondary },
  predictionCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 20,
    margin: 20,
    marginTop: 8,
  },
  cardLabel: { fontSize: 13, color: palette.textMuted, marginBottom: 6 },
  cardDate: { fontSize: 18, fontWeight: '700', color: palette.textPrimary, textTransform: 'capitalize' },
  cardTime: { fontSize: 26, fontWeight: '800', color: palette.accent, marginTop: 2 },
  cardRange: { fontSize: 13, color: palette.textSecondary, marginTop: 4 },
  alarmBtn: {
    marginTop: 16,
    backgroundColor: palette.accent,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  alarmBtnText: { color: palette.textOnAccent, fontWeight: '600', fontSize: 15 },
});
