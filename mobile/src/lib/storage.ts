import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  calendar: 'calendar_v1',
  inbox: 'inbox_v1',
  deviceState: 'device_state_v1',
  language: 'language',
  preferences: 'preferences',
  firstLaunchDone: 'first_launch_done',
} as const;

export async function getItem<T>(key: keyof typeof KEYS): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS[key]);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setItem(key: keyof typeof KEYS, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS[key], JSON.stringify(value));
  } catch {
    // silently fail
  }
}

export async function getLanguage(): Promise<'ar' | 'ru' | 'en'> {
  try {
    const lang = await AsyncStorage.getItem(KEYS.language);
    if (lang === 'ar' || lang === 'ru' || lang === 'en') return lang;
  } catch {
    // fallback
  }
  return 'ar';
}

export async function setLanguage(lang: 'ar' | 'ru' | 'en'): Promise<void> {
  await AsyncStorage.setItem(KEYS.language, lang);
}

export interface DevicePreferences {
  services: boolean;
  announcements: boolean;
}

export async function getPreferences(): Promise<DevicePreferences> {
  const stored = await getItem<DevicePreferences>('preferences');
  return stored || { services: true, announcements: true };
}

export async function setPreferences(prefs: DevicePreferences): Promise<void> {
  await setItem('preferences', prefs);
}
