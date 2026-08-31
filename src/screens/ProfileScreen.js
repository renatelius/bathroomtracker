import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getProfile, saveProfile, saveLang, clearAll } from '../store/storage';
import { useI18n } from '../i18n';
import { ScreenHeader, Card, Button, Chip, Icon } from '../ui';
import { useThemeColors, type, space } from '../theme';
import { LANGS } from '../i18n/locales';

const BODY_LABELS = {
  asthenic: 'РђСЃС‚РµРЅРёРє',
  normostenic: 'РќРѕСЂРјРѕСЃС‚РµРЅРёРє',
  hypersthenic: 'Р“РёРїРµСЂСЃС‚РµРЅРёРє',
};
const SEX_LABELS = { male: 'РњСѓР¶СЃРєРѕР№', female: 'Р–РµРЅСЃРєРёР№' };

export default function ProfileScreen() {
  const palette = useThemeColors();
  const { t, lang, setLang } = useI18n();
  const [profile, setProfile] = useState(null);
  const [avatar, setAvatar] = useState(null);

  const load = useCallback(async () => {
    const p = await getProfile();
    setProfile(p);
    setAvatar(p?.avatarUri || null);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function chooseAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const merged = { ...(profile || {}), avatarUri: result.assets[0].uri };
      await saveProfile(merged);
      setProfile(merged);
      setAvatar(merged.avatarUri);
    }
  }

  async function resetData() {
    Alert.alert(
      'РЎР±СЂРѕСЃРёС‚СЊ РІСЃРµ РґР°РЅРЅС‹Рµ?',
      'РџСЂРѕС„РёР»СЊ, РёСЃС‚РѕСЂРёСЏ Рё РЅР°СЃС‚СЂРѕР№РєРё Р±СѓРґСѓС‚ СѓРґР°Р»РµРЅС‹. Р­С‚Рѕ РґРµР№СЃС‚РІРёРµ РЅРµР»СЊР·СЏ РѕС‚РјРµРЅРёС‚СЊ.',
      [
        { text: 'РћС‚РјРµРЅР°', style: 'cancel' },
        {
          text: 'РЎР±СЂРѕСЃРёС‚СЊ',
          style: 'destructive',
          onPress: async () => {
            await clearAll();
            await saveLang(lang);
            Alert.alert('Р“РѕС‚РѕРІРѕ', 'Р”Р°РЅРЅС‹Рµ СЃР±СЂРѕС€РµРЅС‹. РџРµСЂРµР·Р°РїСѓСЃС‚РёС‚Рµ РїСЂРёР»РѕР¶РµРЅРёРµ.');
          },
        },
      ]
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
        <Text style={[styles.loading, { color: palette.textMuted }]}>Загрузка…</Text>
      </SafeAreaView>
    );
  }

  const initials = profile.name
    ? profile.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : 'вЂ”';

  const rows = [
    { icon: 'profile', title: 'РџРѕР»', value: SEX_LABELS[profile.sex] || profile.sex },
    { icon: 'energy', title: 'Р РѕСЃС‚', value: `${profile.heightCm} СЃРј` },
    { icon: 'energy', title: 'Р’РµСЃ', value: `${profile.weightKg} РєРі` },
    { icon: 'forecast', title: 'Р“РѕРґ СЂРѕР¶РґРµРЅРёСЏ', value: String(profile.birthYear || '') },
    { icon: 'settings', title: 'РўРµР»РѕСЃР»РѕР¶РµРЅРёРµ', value: BODY_LABELS[profile.bodyType] || profile.bodyType },
  ];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title={t('profile')} subtitle="Ваш профиль и настройки" icon="profile" />

        <Card>
          <TouchableOpacity style={styles.avatarRow} onPress={chooseAvatar} activeOpacity={0.8}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: palette.accentSoft }]}>
                <Text style={[styles.avatarText, { color: palette.accent }]}>{initials}</Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: space.md }}>
              <Text style={[styles.avatarTitle, { color: palette.textPrimary }]}>{profile.name || 'Профиль'}</Text>
              <Text style={[styles.avatarHint, { color: palette.textMuted }]}>Нажмите, чтобы изменить фото</Text>
            </View>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: palette.divider }]} />
          {rows.map((r) => (
            <View key={r.title} style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: palette.accentSoft }]}>
                <Icon name={r.icon} size={18} color={palette.accent} />
              </View>
              <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{r.title}</Text>
              <Text style={[styles.rowValue, { color: palette.textSecondary }]}>{r.value}</Text>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{t('language')}</Text>
          <View style={styles.langWrap}>
            {LANGS.map((l) => (
              <Chip
                key={l.code}
                label={l.native}
                active={lang === l.code}
                onPress={() => setLang(l.code)}
              />
            ))}
          </View>
        </Card>

        <Button title="РЎР±СЂРѕСЃРёС‚СЊ РґР°РЅРЅС‹Рµ" icon="close" variant="danger" onPress={resetData} style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: space.xl, paddingTop: 16 },
  loading: { textAlign: 'center', marginTop: 60 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.md },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 64, height: 64, borderRadius: 32, resizeMode: 'cover' },
  avatarText: { fontSize: 22, fontWeight: type.heavy },
  avatarTitle: { fontSize: 18, fontWeight: type.semibold },
  avatarHint: { fontSize: type.caption, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, flex: 1, paddingLeft: space.md },
  rowValue: { fontSize: 15, fontWeight: type.medium },
  divider: { height: StyleSheet.hairlineWidth },
  sectionTitle: { fontSize: type.section, fontWeight: type.semibold, marginBottom: space.md },
  langWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  spacer: { marginTop: space.md },
});
