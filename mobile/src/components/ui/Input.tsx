import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { getFontFamily, type Language } from '../../theme/fonts';

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string;
  helper?: string;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  containerStyle?: StyleProp<ViewStyle>;
};

export function Input({
  label,
  error,
  helper,
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  containerStyle,
  onFocus,
  onBlur,
  ...textInputProps
}: Props) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const lang = (i18n.language as Language) || 'ar';
  const fonts = getFontFamily(lang);
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.error
    : focused
    ? theme.colors.gold
    : theme.colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            { color: theme.colors.ink, fontFamily: fonts.bodyBold },
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.colors.white,
            borderColor,
            borderRadius: theme.radius.sm,
            borderWidth: focused ? 2 : 1,
            paddingHorizontal: theme.spacing.md,
            minHeight: 44,
          },
        ]}
      >
        {LeadingIcon && (
          <LeadingIcon
            size={18}
            color={theme.colors.inkMuted}
            strokeWidth={1.75}
            style={styles.leadingIcon}
          />
        )}
        <TextInput
          {...textInputProps}
          placeholderTextColor={theme.colors.inkFaint}
          selectionColor={theme.colors.gold}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: theme.colors.ink,
              fontFamily: fonts.body,
            },
          ]}
        />
        {TrailingIcon && (
          <TrailingIcon
            size={18}
            color={theme.colors.inkMuted}
            strokeWidth={1.75}
            style={styles.trailingIcon}
          />
        )}
      </View>

      {(error || helper) && (
        <Text
          style={[
            styles.helper,
            {
              color: error ? theme.colors.error : theme.colors.inkMuted,
              fontFamily: fonts.body,
            },
          ]}
        >
          {error || helper}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  leadingIcon: {
    marginEnd: 8,
  },
  trailingIcon: {
    marginStart: 8,
  },
  helper: {
    fontSize: 12,
    marginTop: 2,
  },
});
