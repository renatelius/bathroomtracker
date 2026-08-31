import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { getProfile } from './src/store/storage';
import I18nProvider, { useI18n } from './src/i18n';
import { Icon } from './src/ui';
import { useThemeColors, ThemeProvider } from './src/theme';
import { setGoToLogHandler } from './src/services/nav';
import { onNotificationTap } from './src/services/notifications';
import Onboarding from './src/screens/Onboarding';
import LogScreen from './src/screens/LogScreen';
import PredictScreen from './src/screens/PredictScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

function TabBarIcon({ name, color, size }) {
  return <Icon name={name} size={size || 22} color={color} strokeWidth="regular" />;
}

function MainNavigator() {
  const { t } = useI18n();
  const palette = useThemeColors();

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
      // Поддержка нажатия по локальному уведомлению.
      const unsubscribe = onNotificationTap();
      return () => unsubscribe && unsubscribe();
    }
    return undefined;
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: palette.accent,
          tabBarInactiveTintColor: palette.textMuted,
          tabBarIcon: ({ color, size }) => {
            const icons = {
              'Прогноз': 'forecast',
              'Лог': 'food',
              'Календарь': 'calendar',
              'История': 'history',
              'Настройки': 'settings',
              'Профиль': 'profile',
            };
            return <TabBarIcon name={icons[route.name] || 'list'} color={color} size={size} />;
          },
        })}
      >
        <Tab.Screen name="Прогноз" component={PredictScreen} options={{ tabBarLabel: t('tabForecast') }} />
        <Tab.Screen name="Лог" component={LogScreen} options={{ tabBarLabel: t('tabLog') }} />
        <Tab.Screen name="Календарь" component={CalendarScreen} options={{ tabBarLabel: t('tabCalendar') }} />
        <Tab.Screen name="История" component={HistoryScreen} options={{ tabBarLabel: t('tabHistory') }} />
        <Tab.Screen name="Профиль" component={ProfileScreen} options={{ tabBarLabel: t('tabProfile') }} />
        <Tab.Screen name="Настройки" component={SettingsScreen} options={{ tabBarLabel: t('tabSettings') }} />
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
