import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import { getFontFamily, type Language } from '../theme/fonts';
import TabNavigator from './TabNavigator';
import FastingScreen from '../screens/FastingScreen';

// Stack wrapper so we can push non-tab screens (Fasting, future Agpeya, etc.)
// over the tab shell. Tab screens remain headerless; stack screens get a native
// header with localized title.

export type RootStackParamList = {
  Tabs: undefined;
  Fasting: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const lang = (i18n.language as Language) || 'ar';
  const fonts = getFontFamily(lang);

  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="Fasting"
        component={FastingScreen}
        options={{
          title: t('fasting_calendar'),
          headerStyle: { backgroundColor: theme.colors.parchment },
          headerTintColor: theme.colors.ink,
          headerTitleStyle: { fontFamily: fonts.heading },
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
