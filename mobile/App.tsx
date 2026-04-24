import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus, I18nManager, Platform } from 'react-native';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import messaging from '@react-native-firebase/messaging';

import { useFonts, Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import { NotoNaskhArabic_400Regular, NotoNaskhArabic_600SemiBold } from '@expo-google-fonts/noto-naskh-arabic';
import { CormorantGaramond_400Regular, CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { PTSerif_400Regular, PTSerif_700Bold } from '@expo-google-fonts/pt-serif';
import { PTSans_400Regular, PTSans_700Bold } from '@expo-google-fonts/pt-sans';

import './src/lib/i18n';
import i18n from './src/lib/i18n';
import { getLanguage, getItem, setItem } from './src/lib/storage';
import {
  setupNotificationChannels,
  requestPermissions,
  getDevicePushToken,
  scheduleServiceReminders,
  handleIncomingFcm,
  registerNotifeeForegroundHandler,
} from './src/lib/notifications';
import { registerDevice, heartbeat, fetchCalendar, fetchAnnouncements, CalendarEventData } from './src/lib/api';
import { expandEvents } from './src/lib/rrule';
import RootNavigator from './src/navigation/RootNavigator';
import LanguagePickerScreen from './src/screens/LanguagePickerScreen';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Deep-link routing for Android app shortcuts (copticmoscow://inbox, etc.)
const linking: LinkingOptions<ReactNavigation.RootParamList> = {
  prefixes: [Linking.createURL('/'), 'copticmoscow://'],
  config: {
    screens: {
      Tabs: {
        screens: {
          Home: 'home',
          Calendar: 'calendar',
          Inbox: 'inbox',
          Settings: 'settings',
        },
      },
      Fasting: 'fasting',
    },
  },
};

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

// Background FCM handler — must be registered at module scope so it fires
// when the app is backgrounded or killed. Backend sends data-only messages,
// so WE build the notification via notifee here. No system auto-display
// competes with us → exactly one notification per FCM.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  await handleIncomingFcm(remoteMessage);
});

export default function App() {
  const [fontsLoaded] = useFonts({
    Amiri_400Regular, Amiri_700Bold,
    NotoNaskhArabic_400Regular, NotoNaskhArabic_600SemiBold,
    CormorantGaramond_400Regular, CormorantGaramond_600SemiBold, CormorantGaramond_700Bold,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    PTSerif_400Regular, PTSerif_700Bold,
    PTSans_400Regular, PTSans_700Bold,
  });

  const [isReady, setIsReady] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    initialize();
  }, []);

  // Re-sync when the app returns to foreground — keeps calendar/announcements fresh
  // after admin edits or deletes (stale local reminders get re-computed + cancelled).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        syncData().catch(() => {
          /* silent — offline handled by sync itself */
        });
      }
      appState.current = next;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Foreground FCM listener — when a message arrives while the app is open,
  // build the bubble notification ourselves (the system would otherwise do
  // nothing with data-only messages).
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      await handleIncomingFcm(remoteMessage);
    });
    return unsubscribe;
  }, []);

  // Notifee foreground event listener — lets us react to "Watch" action taps
  // and body-tap on stream-URL notifications while the app is open. The
  // background variant is registered at module scope inside notifications.ts.
  useEffect(() => {
    return registerNotifeeForegroundHandler();
  }, []);

  const initialize = async () => {
    // 1. Load stored language and apply RTL
    const lang = await getLanguage();
    await i18n.changeLanguage(lang);
    const needsRTL = lang === 'ar';
    if (I18nManager.isRTL !== needsRTL) {
      I18nManager.forceRTL(needsRTL);
      I18nManager.allowRTL(needsRTL);
    }

    // 2. Check if first launch
    const firstLaunchDone = await getItem<boolean>('firstLaunchDone');
    if (!firstLaunchDone) {
      setShowLanguagePicker(true);
      setIsReady(true);
      return;
    }

    // 3. Setup notifications + sync
    await setupNotificationChannels();
    await syncData();

    setIsReady(true);
  };

  const ensureDeviceRegistered = async (): Promise<void> => {
    try {
      await setupNotificationChannels();
      const granted = await requestPermissions();
      if (!granted) return;
      const token = await getDevicePushToken();
      if (!token) return;
      const lang = await getLanguage();
      await registerDevice({
        fcm_token: token,
        platform: Platform.OS as 'ios' | 'android',
        app_version: '1.0.0',
        language: lang,
        preferences: { services: true, announcements: true },
      });
      await setItem('deviceState', { fcm_token: token });
    } catch {
      // Silent — will retry on next launch
    }
  };

  const syncData = async () => {
    // Register OR heartbeat — retry registration on every launch until it succeeds
    const device = await getItem<{ fcm_token: string }>('deviceState');
    if (device?.fcm_token) {
      try { await heartbeat(device.fcm_token); } catch { /* offline */ }
    } else {
      await ensureDeviceRegistered();
    }

    try {
      // Calendar sync
      const calendarData = await fetchCalendar();
      if (calendarData.length > 0) {
        await setItem('calendar', calendarData);
        // Schedule local reminders
        const occurrences = expandEvents(calendarData);
        await scheduleServiceReminders(occurrences);
      }

      // Inbox sync
      const inboxData = await fetchAnnouncements(50);
      if (inboxData.length > 0) {
        await setItem('inbox', inboxData);
      }
    } catch {
      // Offline — use cached data
    }
  };

  const handleFirstLaunchDone = async () => {
    await setItem('firstLaunchDone', true);
    setShowLanguagePicker(false);

    // First registration attempt (will retry on future launches if it fails here)
    await ensureDeviceRegistered();

    await syncData();
  };

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && isReady) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isReady]);

  if (!fontsLoaded || !isReady) return null;

  if (showLanguagePicker) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <SafeAreaProvider onLayout={onLayoutRootView}>
            <LanguagePickerScreen onDone={handleFirstLaunchDone} />
          </SafeAreaProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SafeAreaProvider onLayout={onLayoutRootView}>
          <NavigationContainer linking={linking}>
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
