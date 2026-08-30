import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { getProfile } from './src/store/storage';
import Onboarding from './src/screens/Onboarding';
import LogScreen from './src/screens/LogScreen';
import PredictScreen from './src/screens/PredictScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Tab = createBottomTabNavigator();

export default function App() {
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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <>
        <StatusBar style="auto" />
        <Onboarding onDone={onProfileSaved} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#2f6fed',
        }}
      >
        <Tab.Screen name="Прогноз" component={PredictScreen} />
        <Tab.Screen name="Лог" component={LogScreen} />
        <Tab.Screen name="Календарь" component={CalendarScreen} />
        <Tab.Screen name="История" component={HistoryScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
