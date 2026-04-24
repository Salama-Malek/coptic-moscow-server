import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { getFontFamily, type Language } from '../../theme/fonts';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

type Props = {
  kind?: ToastKind;
  message: string;
  visible: boolean;
  onDismiss?: () => void;
  duration?: number;
};

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

export function Toast({
  kind = 'info',
  message,
  visible,
  onDismiss,
  duration = 3000,
}: Props) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const lang = (i18n.language as Language) || 'ar';
  const fonts = getFontFamily(lang);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: theme.motion.duration.medium,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: theme.motion.duration.medium,
          useNativeDriver: true,
        }),
      ]).start();

      if (duration > 0 && onDismiss) {
        const t = setTimeout(onDismiss, duration);
        return () => clearTimeout(t);
      }
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: theme.motion.duration.short,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: theme.motion.duration.short,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, duration, onDismiss, opacity, translateY, theme.motion.duration]);

  const palette = getPalette(theme.colors, kind);
  const Icon = ICONS[kind];

  if (!visible && (opacity as unknown as { _value: number })._value === 0) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.wrap,
        {
          opacity,
          transform: [{ translateY }],
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderRadius: theme.radius.md,
          ...theme.shadows.md,
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Icon size={20} color={palette.fg} strokeWidth={1.75} />
      <Text
        style={[
          styles.text,
          { color: palette.fg, fontFamily: fonts.body },
        ]}
        numberOfLines={3}
      >
        {message}
      </Text>
    </Animated.View>
  );
}

function getPalette(
  colors: ReturnType<typeof useTheme>['theme']['colors'],
  kind: ToastKind,
) {
  switch (kind) {
    case 'success':
      return { bg: colors.successSoft, fg: colors.success, border: colors.success };
    case 'error':
      return { bg: colors.errorSoft, fg: colors.error, border: colors.error };
    case 'warning':
      return { bg: colors.warningSoft, fg: colors.warning, border: colors.warning };
    case 'info':
      return { bg: colors.surface, fg: colors.ink, border: colors.border };
  }
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    paddingHorizontal: 16,
    margin: 16,
    borderWidth: 1,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
