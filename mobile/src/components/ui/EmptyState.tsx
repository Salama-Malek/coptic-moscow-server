import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { getFontFamily, type Language } from '../../theme/fonts';

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const lang = (i18n.language as Language) || 'ar';
  const fonts = getFontFamily(lang);

  return (
    <View style={[styles.container, { padding: theme.spacing.xl }]}>
      {Icon && (
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.full,
            },
          ]}
        >
          <Icon
            size={36}
            color={theme.colors.gold}
            strokeWidth={1.5}
          />
        </View>
      )}
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.ink,
            fontFamily: fonts.heading,
            ...theme.typography.h2,
          },
        ]}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={[
            styles.description,
            {
              color: theme.colors.inkMuted,
              fontFamily: fonts.body,
              ...theme.typography.body,
            },
          ]}
        >
          {description}
        </Text>
      )}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
});
