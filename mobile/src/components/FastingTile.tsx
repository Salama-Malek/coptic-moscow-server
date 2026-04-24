import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Flame, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { getFontFamily, type Language } from '../theme/fonts';
import { Card } from './ui/Card';
import { getFastingDay, type FastType } from '../lib/fasting';
import type { RootStackParamList } from '../navigation/RootNavigator';

// Home-screen tile: today's fasting status. Taps through to the full
// FastingScreen. Recomputed from a pure function every render so the value
// stays current across midnight-crossings without any refresh plumbing.

export default function FastingTile() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const lang = (i18n.language as Language) || 'ar';
  const fonts = getFontFamily(lang);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const today = useMemo(() => getFastingDay(new Date()), []);
  const label = today.feastKey ? t(today.feastKey) : t(`fast_period_${today.period}`);
  const typeLabel = t(`fast_type_${today.type}`);

  const swatch = typeSwatch(today.type);

  return (
    <Pressable onPress={() => navigation.navigate('Fasting')} accessibilityRole="button">
      <Card
        elevation="sm"
        padding="md"
        goldAccent={today.type !== 'none'}
      >
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: swatch.bg }]}>
            <Flame size={20} color={swatch.fg} strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[
                styles.kicker,
                { color: theme.colors.inkMuted, fontFamily: fonts.body },
              ]}
            >
              {t('fasting_today')}
            </Text>
            <Text
              style={[
                { color: theme.colors.ink, fontFamily: fonts.bodyBold, ...theme.typography.body, marginTop: 2 },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
            <Text
              style={[
                { color: theme.colors.inkMuted, fontFamily: fonts.body, ...theme.typography.bodySmall, marginTop: 2 },
              ]}
              numberOfLines={1}
            >
              {typeLabel}
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.inkMuted} strokeWidth={1.5} />
        </View>
      </Card>
    </Pressable>
  );
}

function typeSwatch(type: FastType): { bg: string; fg: string } {
  switch (type) {
    case 'strict':
      return { bg: '#f5e6cc', fg: '#7a4f1a' };
    case 'wine_oil':
      return { bg: '#f3e7b8', fg: '#6b5420' };
    case 'fish':
      return { bg: '#d9e6cc', fg: '#3f5a36' };
    case 'none':
    default:
      return { bg: '#e8e4da', fg: '#4a4a42' };
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
