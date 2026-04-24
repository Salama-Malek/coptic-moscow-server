import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';

export default function OfflineBadge({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t('offline')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.muted,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 8,
  },
  text: {
    color: colors.white,
    fontSize: 12,
  },
});
