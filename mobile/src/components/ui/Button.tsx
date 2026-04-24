import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { getFontFamily, type Language } from '../../theme/fonts';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

type Props = {
  onPress?: () => void;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 };
const PADDING_H: Record<ButtonSize, number> = { sm: 12, md: 16, lg: 20 };
const FONT_SIZE: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 17 };
const ICON_SIZE: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  accessibilityLabel,
  style,
}: Props) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const lang = (i18n.language as Language) || 'ar';
  const fonts = getFontFamily(lang);

  const palette = getPalette(theme.colors, variant);
  const height = HEIGHT[size];
  const paddingH = PADDING_H[size];
  const iconSize = ICON_SIZE[size];
  const fontSize = FONT_SIZE[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          paddingHorizontal: paddingH,
          borderRadius: theme.radius.md,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.border ? 1 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          width: fullWidth ? '100%' : undefined,
          ...(variant === 'primary' ? theme.shadows.sm : theme.shadows.none),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {LeadingIcon && (
            <LeadingIcon
              size={iconSize}
              color={palette.fg}
              strokeWidth={1.75}
              style={styles.leadingIcon}
            />
          )}
          <Text
            style={[
              styles.label,
              {
                color: palette.fg,
                fontSize,
                fontFamily: fonts.bodyBold,
              },
            ]}
            numberOfLines={1}
          >
            {children}
          </Text>
          {TrailingIcon && (
            <TrailingIcon
              size={iconSize}
              color={palette.fg}
              strokeWidth={1.75}
              style={styles.trailingIcon}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

function getPalette(colors: ReturnType<typeof useTheme>['theme']['colors'], variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return { bg: colors.primary, fg: colors.white, border: '' };
    case 'secondary':
      return { bg: colors.surface, fg: colors.ink, border: colors.border };
    case 'ghost':
      return { bg: 'transparent', fg: colors.primary, border: '' };
    case 'destructive':
      return { bg: colors.error, fg: colors.white, border: '' };
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    textAlign: 'center',
  },
  leadingIcon: {
    marginEnd: 2,
  },
  trailingIcon: {
    marginStart: 2,
  },
});
