import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { SpacingKey } from '../../theme/spacing';
import type { ShadowKey } from '../../theme/shadows';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  padding?: SpacingKey;
  elevation?: ShadowKey;
  goldAccent?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Card({
  children,
  onPress,
  padding = 'lg',
  elevation = 'sm',
  goldAccent = false,
  style,
  accessibilityLabel,
}: Props) {
  const { theme } = useTheme();

  const base: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing[padding],
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows[elevation],
    overflow: 'hidden',
  };

  const accent = goldAccent ? (
    <View
      style={[
        styles.accent,
        { backgroundColor: theme.colors.gold, height: 2 },
      ]}
    />
  ) : null;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          base,
          { opacity: pressed ? 0.92 : 1 },
          style,
        ]}
      >
        {accent}
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[base, style]}>
      {accent}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
