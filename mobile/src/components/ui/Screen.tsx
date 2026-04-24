import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  ViewStyle,
  StyleProp,
  RefreshControlProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { getFontFamily, type Language } from '../../theme/fonts';

type Props = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  scrollable?: boolean;
  padded?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
  headerRight?: React.ReactNode;
};

export function Screen({
  children,
  title,
  subtitle,
  scrollable = true,
  padded = true,
  refreshControl,
  contentStyle,
  headerRight,
}: Props) {
  const { theme, isDark } = useTheme();
  const { i18n } = useTranslation();
  const lang = (i18n.language as Language) || 'ar';
  const fonts = getFontFamily(lang);

  const Container = scrollable ? ScrollView : View;
  const containerProps = scrollable
    ? {
        refreshControl,
        contentContainerStyle: [
          padded && {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing['3xl'],
          },
          contentStyle,
        ],
        showsVerticalScrollIndicator: false,
      }
    : {
        style: [
          { flex: 1 },
          padded && { paddingHorizontal: theme.spacing.lg },
          contentStyle,
        ],
      };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.parchment }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.parchment}
      />
      {(title || headerRight) && (
        <View
          style={[
            styles.header,
            {
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.lg,
              paddingBottom: theme.spacing.md,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            {title && (
              <>
                <Text
                  style={[
                    styles.title,
                    {
                      color: theme.colors.ink,
                      fontFamily: fonts.heading,
                      ...theme.typography.h1,
                    },
                  ]}
                >
                  {title}
                </Text>
                <View
                  style={[
                    styles.goldRule,
                    { backgroundColor: theme.colors.gold },
                  ]}
                />
                {subtitle && (
                  <Text
                    style={[
                      styles.subtitle,
                      {
                        color: theme.colors.inkMuted,
                        fontFamily: fonts.body,
                        ...theme.typography.bodySmall,
                      },
                    ]}
                  >
                    {subtitle}
                  </Text>
                )}
              </>
            )}
          </View>
          {headerRight && <View>{headerRight}</View>}
        </View>
      )}

      <Container {...(containerProps as Record<string, unknown>)}>
        {children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    marginBottom: 6,
  },
  goldRule: {
    height: 2,
    width: 36,
    borderRadius: 1,
    marginBottom: 8,
  },
  subtitle: {
    marginTop: 2,
  },
});
