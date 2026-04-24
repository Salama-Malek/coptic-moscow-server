import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import CopticCross from '../components/CopticCross';
import { setLanguage } from '../lib/storage';

interface Props {
  onDone: () => void;
}

const languages = [
  { code: 'ar' as const, label: 'العربية', rtl: true },
  { code: 'ru' as const, label: 'Русский', rtl: false },
  { code: 'en' as const, label: 'English', rtl: false },
];

export default function LanguagePickerScreen({ onDone }: Props) {
  const { i18n } = useTranslation();

  const selectLanguage = async (lang: 'ar' | 'ru' | 'en') => {
    await setLanguage(lang);
    await i18n.changeLanguage(lang);

    const needsRTL = lang === 'ar';
    if (I18nManager.isRTL !== needsRTL) {
      I18nManager.forceRTL(needsRTL);
      I18nManager.allowRTL(needsRTL);
      // RTL change requires app restart — proceed and it will apply on next launch
      onDone();
      return;
    }

    onDone();
  };

  return (
    <View style={styles.container}>
      <CopticCross size={80} />
      <Text style={styles.title}>الكنيسة القبطية بموسكو</Text>
      <Text style={styles.subtitle}>Коптская Церковь в Москве</Text>
      <Text style={styles.subtitle}>Coptic Church Moscow</Text>

      <View style={styles.buttons}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={styles.button}
            onPress={() => selectLanguage(lang.code)}
          >
            <Text style={styles.buttonText}>{lang.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  buttons: {
    marginTop: 40,
    width: '100%',
    gap: 12,
  },
  button: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  buttonText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
});
