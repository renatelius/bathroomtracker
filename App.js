import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { getProfile } from './src/store/storage';
import I18nProvider, { useI18n } from './src/i18n';
import { Icon } from './src/ui';
import { palette } from './src/theme';
import Onboarding from './src/screens/Onboarding';
import LogScreen from './src/screens/LogScreen';
import PredictScreen from './src/screens/PredictScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function TabBarIcon({ name, color, size }) {
  return <Icon name={name} size={size || 22} color={color} strokeWidth="regular" />;
}

function MainNavigator() {
  const { t } = useI18n();
  return (
    <NavigationContainer>
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
        <Tab.Screen name="Настройки" component={SettingsScreen} options={{ tabBarLabel: t('tabSettings') }} />
        <Tab.Screen name="Профиль" component={ProfileScreen} options={{ tabBarLabel: t('tabProfile') }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function Root() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

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
  return <Root />;
}
