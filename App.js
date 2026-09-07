import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, View, Platform, Text, TouchableOpacity, Pressable, Modal, StyleSheet, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { getProfile } from './src/store/storage';
import { addDefecation } from './src/store/storage';
import I18nProvider, { useI18n } from './src/i18n';
import { Icon } from './src/ui';
import { useThemeColors, ThemeProvider, radius, space, shadow } from './src/theme';
import { setGoToLogHandler } from './src/services/nav';
import { onNotificationTap } from './src/services/notifications';
import Onboarding from './src/screens/Onboarding';
import LogScreen from './src/screens/LogScreen';
import PredictScreen from './src/screens/PredictScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import BristolScreen from './src/screens/BristolScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SecurityScreen from './src/screens/SecurityScreen';
import SyncSettingsScreen from './src/screens/SyncSettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import './src/services/syncService';

const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

const TAB_BAR_HEIGHT = Platform.OS === 'android' ? 56 : 49;

/**
 * Деп-линки. Маршруты:
 *  - web:  https://…/bathroomtracker/#/log  |  #/settings  |  #/prediction  и т.д.
 *  - native:  bathroomtracker://log  |  bathroomtracker://settings  и т.д.
 * Хэш-стратегия для web нужна, т.к. статический хостинг (GitHub Pages)
 * не переписывает пути, поэтому внешние ссылки ведут на корень.
 */
const DEEP_SCREENS = {
  '': null,
  main: null,
  home: 'Сегодня',
  today: 'Сегодня',
  сегодня: 'Сегодня',
  прогноз: 'Сегодня',
  prediction: 'Сегодня',
  predict: 'Сегодня',
  история: 'История',
  history: 'История',
  календарь: 'Календарь',
  calendar: 'Календарь',
  статистика: 'Календарь',
  stats: 'Календарь',
  лог: 'Лог',
  log: 'Лог',
  add: 'Лог',
  new: 'Лог',
  профиль: 'Профиль',
  profile: 'Профиль',
  настройки: 'Настройки',
  settings: 'Настройки',
  синхронизация: 'Синхронизация',
  sync: 'Синхронизация',
  cloud: 'Синхронизация',
};

function parseDeepUrl(rawUrl) {
  const candidates = [];
  if (typeof rawUrl === 'string') candidates.push(rawUrl);
  if (Platform.OS === 'web' && typeof window !== 'undefined') candidates.push(window.location.href);
  for (const raw of candidates) {
    let path = '';
    try {
      const u = new URL(raw);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        if (u.hash) path = u.hash.replace(/^#\/?/, '');
        else path = u.pathname.replace(/^\/+/, '');
      } else {
        path = raw.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
      }
    } catch {
      path = raw;
    }
    path = path
      .replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '')
      .replace(/\?.*$/, '')
      .replace(/^bathroomtracker\//, '')
      .replace(/^\/+|\/+$/g, '');
    const first = path.split('/')[0].toLowerCase();
    if (DEEP_SCREENS[first] != null) return DEEP_SCREENS[first];
  }
  return null;
}

/** Дожидается готовности навигатора и переходит на экран по деп-линку. */
async function navigateWhenReady(screen) {
  for (let i = 0; i < 100; i++) {
    if (navigationRef.isReady()) {
      navigationRef.navigate(screen);
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

function useDeepLinks() {
  useEffect(() => {
    const onUrl = (event) => {
      const screen = parseDeepUrl(event && event.url);
      if (screen) navigateWhenReady(screen);
    };
    Linking.getInitialURL().then(onUrl).catch(() => {});
    const sub = Linking.addEventListener('url', onUrl);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onHash = () => onUrl({ url: window.location.href });
      window.addEventListener('hashchange', onHash);
      return () => {
        window.removeEventListener('hashchange', onHash);
        if (sub && sub.remove) sub.remove();
      };
    }
    return () => { if (sub && sub.remove) sub.remove(); };
  }, []);
}

function TabBarIcon({ name, color, size }) {
  return <Icon name={name} size={size || 22} color={color} strokeWidth="regular" />;
}

/**
 * Быстрое действие «Дефекация сейчас» из центрального FAB.
 * Показывает временную галочку, затем возвращает состояние к «+».
 */
function useQuickDefecation() {
  const [confirmed, setConfirmed] = useState(false);
  const timer = useRef(null);

  const log = useCallback(async () => {
    await addDefecation({ id: `d_${Date.now()}`, timeMs: Date.now() });
    setConfirmed(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setConfirmed(false), 1600);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { confirmed, log };
}

function SpeedDialModal({ visible, onClose, palette, onGoSearch, onGoPhoto, onDefecation }) {
  const insets = useSafeAreaInsets();
  const dialBottom = insets.bottom + TAB_BAR_HEIGHT + 72;
  const compact = visible;
  return (
    <Modal visible={compact} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.dialBackdrop} onPress={onClose} accessibilityLabel="Закрыть меню добавления" />
      <View pointerEvents="box-none" style={styles.dialHost}>
        <View style={[styles.dialCard, { backgroundColor: palette.surface, bottom: dialBottom, ...shadow.sheet }]}>
          <Text style={[styles.dialTitle, { color: palette.textSecondary }]}>Добавить запись</Text>
          <DialRow icon="food" label="Приём пищи — поиск" onPress={() => { onClose(); onGoSearch(); }} palette={palette} />
          <DialRow icon="photo" label="Приём пищи — фото" onPress={() => { onClose(); onGoPhoto(); }} palette={palette} />
          <DialRow icon="check" label="Дефекация сейчас" accent onPress={onDefecation} palette={palette} />
        </View>
      </View>
    </Modal>
  );
}

function DialRow({ icon, label, onPress, palette, accent }) {
  const color = accent ? palette.accent : palette.textPrimary;
  const iconBg = accent ? palette.accentSoft : palette.surfaceAlt;
  return (
    <TouchableOpacity
      style={[styles.dialRow, { backgroundColor: palette.surface }]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.dialIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.dialLabel, { color: color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * Нижняя навигация: стандартный таб-бар + центральный FAB «+» над ним.
 * Быстрый лог дефекации доступен в один тап прямо из FAB.
 */
function HomeTabBar(props) {
  const palette = useThemeColors();
  const insets = useSafeAreaInsets();
  const [dialVisible, setDialVisible] = useState(false);
  const { confirmed, log } = useQuickDefecation();

  const navigation = props.navigation;

  const goSearch = useCallback(() => {
    navigation.navigate('Лог', { initialMode: 'search' });
  }, [navigation]);

  const goPhoto = useCallback(() => {
    navigation.navigate('Лог', { initialMode: 'photo' });
  }, [navigation]);

  return (
    <View style={styles.tabBarHost}>
      <BottomTabBar {...props} />
      <View
        pointerEvents="box-none"
        style={[styles.fabLayer, { bottom: insets.bottom + TAB_BAR_HEIGHT + 8 }]}
      >
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: palette.accent },
            confirmed && { backgroundColor: palette.success },
          ]}
          onPress={() => (confirmed ? undefined : setDialVisible(true))}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={confirmed ? 'Записано' : 'Добавить запись'}
          accessibilityState={{ expanded: dialVisible }}
        >
          {confirmed ? (
            <Icon name="check" size={26} color={palette.textOnAccent} strokeWidth="bold" />
          ) : (
            <Icon name="plus" size={26} color={palette.textOnAccent} strokeWidth="bold" />
          )}
        </TouchableOpacity>
      </View>

      <SpeedDialModal
        visible={dialVisible}
        onClose={() => setDialVisible(false)}
        palette={palette}
        onGoSearch={goSearch}
        onGoPhoto={goPhoto}
        onDefecation={async () => {
          setDialVisible(false);
          await log();
        }}
      />
    </View>
  );
}

function MainNavigator() {
  const { t } = useI18n();
  const palette = useThemeColors();
  useDeepLinks();

  useEffect(() => {
    // Переход на «Лог» по нажатию на напоминание (native).
    setGoToLogHandler(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Лог');
      }
    });
  }, []);

  useEffect(() => {
    let sub;
    if (Platform.OS !== 'web') {
      const unsubscribe = onNotificationTap();
      return () => unsubscribe && unsubscribe();
    }
    return undefined;
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="auto" />
      <Tab.Navigator
        tabBar={(props) => <HomeTabBar {...props} />}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: palette.accent,
          tabBarInactiveTintColor: palette.textSecondary,
          tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.divider },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
          tabBarIcon: ({ color, size }) => {
            const icons = {
              'Сегодня': 'home',
              'История': 'history',
              'Календарь': 'calendar',
              'Статистика': 'chart',
              'Лог': 'food',
              'Профиль': 'profile',
              'Настройки': 'settings',
            };
            return <TabBarIcon name={icons[route.name] || 'list'} color={color} size={size} />;
          },
        })}
      >
        <Tab.Screen name="Сегодня" component={PredictScreen} options={{ tabBarLabel: t('tabForecast') }} />
        <Tab.Screen name="История" component={HistoryScreen} options={{ tabBarLabel: t('tabHistory') }} />
        <Tab.Screen name="Календарь" component={CalendarScreen} options={{ tabBarLabel: t('tabCalendar') }} />
        <Tab.Screen name="Статистика" component={StatisticsScreen} options={{ tabBarLabel: 'Статистика' }} />
        <Tab.Screen
          name="Бристоль"
          component={BristolScreen}
          options={{ tabBarLabel: 'Бристоль', tabBarButton: () => null }}
        />
        <Tab.Screen
          name="Лог"
          component={LogScreen}
          options={{ tabBarLabel: t('tabLog'), tabBarButton: () => null }}
        />
        <Tab.Screen name="Профиль" component={ProfileScreen} options={{ tabBarLabel: t('tabProfile') }} />
        <Tab.Screen
          name="Достижения"
          component={AchievementsScreen}
          options={{ tabBarLabel: 'Достижения', tabBarButton: () => null }}
        />
        <Tab.Screen
          name="Настройки"
          component={SettingsScreen}
          options={{ tabBarLabel: t('tabSettings'), tabBarButton: () => null }}
        />
        <Tab.Screen
          name="Безопасность"
          component={SecurityScreen}
          options={{ tabBarLabel: 'Безопасность', tabBarButton: () => null }}
        />
        <Tab.Screen
          name="Синхронизация"
          component={SyncSettingsScreen}
          options={{ tabBarLabel: 'Синхронизация', tabBarButton: () => null }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function Root() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const palette = useThemeColors();

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  const onProfileSaved = useCallback((p) => setProfile(p), []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  if (!profile) {
    return (
      <I18nProvider>
        <StatusBar style="auto" />
        <Onboarding onDone={onProfileSaved} />
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <MainNavigator />
    </I18nProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBarHost: { justifyContent: 'flex-end' },
  fabLayer: {
    position: 'absolute',
    alignSelf: 'center',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.accent,
  },
  dialBackdrop: { flex: 1, backgroundColor: 'rgba(28,28,26,0.42)' },
  dialHost: {
    position: 'absolute',
    right: 0,
    left: 0,
    bottom: 0,
    alignItems: 'center',
  },
  dialCard: {
    position: 'absolute',
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    minWidth: 250,
  },
  dialTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: space.xs,
    opacity: 0.8,
  },
  dialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 48,
  },
  dialIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  dialLabel: { fontSize: 15, fontWeight: '500' },
});