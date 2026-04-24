import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
  AppState,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import * as Notifications from 'expo-notifications';
import { BellOff, BellRing, Settings as SettingsIcon } from 'lucide-react-native';
import { colors } from '../theme/colors';
import {
  getLanguage,
  setLanguage,
  getPreferences,
  setPreferences,
  getItem,
  setItem,
  DevicePreferences,
} from '../lib/storage';
import {
  sendTestNotification,
  requestPermissions,
  getDevicePushToken,
  setupNotificationChannels,
} from '../lib/notifications';
import { updateDevicePreferences, registerDevice } from '../lib/api';

const languages = [
  { code: 'ar' as const, label: 'العربية' },
  { code: 'ru' as const, label: 'Русский' },
  { code: 'en' as const, label: 'English' },
];

const ADMIN_URL = 'https://coptic-notify.sm4tech.com/admin';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const [permissionStatus, setPermissionStatus] = useState<string>('');
  const [canAskAgain, setCanAskAgain] = useState<boolean>(true);
  const [registered, setRegistered] = useState<boolean>(false);
  const [prefs, setPrefs] = useState<DevicePreferences>({ services: true, announcements: true });
  const [working, setWorking] = useState(false);

  const loadSettings = useCallback(async () => {
    const perm = await Notifications.getPermissionsAsync();
    setPermissionStatus(perm.status);
    setCanAskAgain(perm.canAskAgain);
    const storedPrefs = await getPreferences();
    setPrefs(storedPrefs);
    const device = await getItem<{ fcm_token: string }>('deviceState');
    setRegistered(!!device?.fcm_token);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Refresh permission state when the user comes back from OS settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') loadSettings();
    });
    return () => sub.remove();
  }, [loadSettings]);

  const handleLanguageChange = async (lang: 'ar' | 'ru' | 'en') => {
    await setLanguage(lang);
    await i18n.changeLanguage(lang);
    const device = await getItem<{ fcm_token: string }>('deviceState');
    if (device?.fcm_token) {
      updateDevicePreferences({ fcm_token: device.fcm_token, language: lang });
    }
    const needsRTL = lang === 'ar';
    if (I18nManager.isRTL !== needsRTL) {
      I18nManager.forceRTL(needsRTL);
      I18nManager.allowRTL(needsRTL);
    }
  };

  const handlePrefToggle = async (key: keyof DevicePreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await setPreferences(updated);
    const device = await getItem<{ fcm_token: string }>('deviceState');
    if (device?.fcm_token) {
      updateDevicePreferences({ fcm_token: device.fcm_token, preferences: updated });
    }
  };

  // Attempt to get permission + register with the backend.
  // If canAskAgain=false (Android already denied), deep-links to OS settings instead.
  const handleEnableNotifications = async () => {
    setWorking(true);
    try {
      if (permissionStatus !== 'granted') {
        if (!canAskAgain) {
          // OS won't show the prompt anymore — send them to app settings
          await Linking.openSettings();
          return;
        }
        await setupNotificationChannels();
        const granted = await requestPermissions();
        if (!granted) {
          // User denied — next attempt will deep-link to settings
          await loadSettings();
          return;
        }
      }

      // Permission is granted — now register with backend
      const token = await getDevicePushToken();
      if (!token) return;
      const lang = await getLanguage();
      await registerDevice({
        fcm_token: token,
        platform: 'android',
        app_version: '1.0.0',
        language: lang,
        preferences: prefs,
      });
      await setItem('deviceState', { fcm_token: token });
      await loadSettings();
    } finally {
      setWorking(false);
    }
  };

  // Determine banner state
  const showEnableBanner = permissionStatus !== 'granted' || !registered;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('settings')}</Text>

      {/* Permission banner — only when there's an issue */}
      {showEnableBanner && (
        <View style={styles.warnBanner}>
          <BellOff size={22} color={colors.warning} strokeWidth={1.75} />
          <View style={{ flex: 1 }}>
            <Text style={styles.warnTitle}>
              {permissionStatus === 'granted'
                ? t('not_registered_title', 'Not registered for push notifications')
                : t('notifications_off_title', 'Notifications are turned off')}
            </Text>
            <Text style={styles.warnBody}>
              {permissionStatus === 'granted'
                ? t(
                    'not_registered_body',
                    'Tap the button below to register so you can receive push notifications from the parish.',
                  )
                : !canAskAgain
                ? t(
                    'permission_locked_body',
                    'Android is blocking the permission request. Tap below to open system settings and enable notifications manually.',
                  )
                : t(
                    'permission_body',
                    'Grant notification permission to receive important announcements from the church.',
                  )}
            </Text>
            <TouchableOpacity
              onPress={handleEnableNotifications}
              disabled={working}
              style={styles.enableBtn}
            >
              {permissionStatus !== 'granted' && !canAskAgain ? (
                <SettingsIcon size={16} color={colors.white} strokeWidth={2} />
              ) : (
                <BellRing size={16} color={colors.white} strokeWidth={2} />
              )}
              <Text style={styles.enableBtnText}>
                {working
                  ? t('loading', 'Loading…')
                  : permissionStatus !== 'granted' && !canAskAgain
                  ? t('open_system_settings', 'Open system settings')
                  : permissionStatus === 'granted' && !registered
                  ? t('register_device', 'Register device')
                  : t('enable_notifications', 'Enable notifications')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Language */}
      <Text style={styles.sectionTitle}>{t('language')}</Text>
      <View style={styles.card}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.langButton, i18n.language === lang.code && styles.langButtonActive]}
            onPress={() => handleLanguageChange(lang.code)}
          >
            <Text
              style={[styles.langText, i18n.language === lang.code && styles.langTextActive]}
            >
              {lang.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notifications */}
      <Text style={styles.sectionTitle}>{t('notifications')}</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('notification_permission')}</Text>
          <Text
            style={[
              styles.rowValue,
              { color: permissionStatus === 'granted' ? colors.success : colors.error },
            ]}
          >
            {permissionStatus === 'granted' ? t('granted') : t('denied')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>
            {t('device_registered', 'Device registered')}
          </Text>
          <Text
            style={[
              styles.rowValue,
              { color: registered ? colors.success : colors.error },
            ]}
          >
            {registered ? t('yes', 'Yes') : t('no', 'No')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('services_notifications')}</Text>
          <Switch
            value={prefs.services}
            onValueChange={() => handlePrefToggle('services')}
            trackColor={{ true: colors.gold }}
            thumbColor={colors.white}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('announcements_notifications')}</Text>
          <Switch
            value={prefs.announcements}
            onValueChange={() => handlePrefToggle('announcements')}
            trackColor={{ true: colors.gold }}
            thumbColor={colors.white}
          />
        </View>
        <TouchableOpacity style={styles.testButton} onPress={sendTestNotification}>
          <Text style={styles.testButtonText}>{t('test_notification')}</Text>
        </TouchableOpacity>
      </View>

      {/* Admin link */}
      <TouchableOpacity
        style={styles.adminLink}
        onPress={() => WebBrowser.openBrowserAsync(ADMIN_URL)}
      >
        <Text style={styles.adminLinkText}>{t('admin_login')}</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>{t('app_version')}: 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.parchment },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '600', color: colors.primary, marginBottom: 14, paddingTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.primary, marginTop: 16, marginBottom: 8 },
  card: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 8,
    backgroundColor: colors.white,
    padding: 14,
  },
  warnBanner: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  warnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  warnBody: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
    marginBottom: 10,
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignSelf: 'flex-start',
  },
  enableBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  langButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  langText: { fontSize: 16, color: colors.ink, textAlign: 'center' },
  langTextActive: { color: colors.white },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.parchmentDark,
  },
  rowLabel: { fontSize: 14, color: colors.ink },
  rowValue: { fontSize: 14, fontWeight: '600' },
  testButton: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
  },
  testButtonText: { color: colors.primary, fontSize: 14 },
  adminLink: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  adminLinkText: { color: colors.primary, fontSize: 14 },
  version: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 20 },
});
