import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ModalProps as RNModalProps,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { getFontFamily, type Language } from '../../theme/fonts';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  variant?: 'center' | 'sheet';
  dismissLabel?: string;
} & Pick<RNModalProps, 'animationType' | 'hardwareAccelerated'>;

export function Modal({
  visible,
  onClose,
  title,
  children,
  variant = 'center',
  dismissLabel,
  animationType,
}: Props) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language as Language) || 'ar';
  const fonts = getFontFamily(lang);

  const isSheet = variant === 'sheet';
  const resolvedAnim = animationType ?? (isSheet ? 'slide' : 'fade');

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={resolvedAnim}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={dismissLabel ?? t('common.close', 'Close')}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            isSheet ? styles.sheet : styles.center,
            {
              backgroundColor: theme.colors.parchment,
              borderColor: theme.colors.border,
              borderTopLeftRadius: theme.radius.lg,
              borderTopRightRadius: theme.radius.lg,
              borderBottomLeftRadius: isSheet ? 0 : theme.radius.lg,
              borderBottomRightRadius: isSheet ? 0 : theme.radius.lg,
              padding: theme.spacing.xl,
              ...theme.shadows.lg,
            },
          ]}
        >
          <View style={styles.header}>
            {title && (
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
            )}
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={dismissLabel ?? t('common.close', 'Close')}
              style={styles.closeBtn}
            >
              <X size={22} color={theme.colors.inkMuted} strokeWidth={1.75} />
            </Pressable>
          </View>
          <View style={styles.body}>{children}</View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  center: {
    margin: 16,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 480,
    marginVertical: 'auto',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    flex: 1,
  },
  closeBtn: {
    padding: 4,
    marginStart: 12,
  },
  body: {
    gap: 12,
  },
});
