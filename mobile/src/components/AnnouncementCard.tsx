import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BellRing, Calendar } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { getFontFamily, type Language } from '../theme/fonts';
import { Card } from './ui/Card';
import VoicePlayer from './VoicePlayer';
import { formatMoscowDate } from '../lib/datetime';
import type { AnnouncementData } from '../lib/api';

interface Props {
  announcement: AnnouncementData;
  /** When true, truncate the body to 3 lines (use on summary screens like Home). Defaults to false — Inbox shows full text. */
  compact?: boolean;
}

export default function AnnouncementCard({ announcement, compact = false }: Props) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const lang = i18n.language as Language;
  const fonts = getFontFamily(lang);

  const title =
    lang === 'ru'
      ? announcement.title_ru || announcement.title_ar
      : lang === 'en'
      ? announcement.title_en || announcement.title_ar
      : announcement.title_ar;

  const body =
    lang === 'ru'
      ? announcement.body_ru || announcement.body_ar
      : lang === 'en'
      ? announcement.body_en || announcement.body_ar
      : announcement.body_ar;

  const date = announcement.sent_at ? formatMoscowDate(announcement.sent_at, lang) : '';

  const isCritical = announcement.priority === 'critical';
  const isHigh = announcement.priority === 'high';

  const Icon = isCritical ? AlertTriangle : BellRing;
  const iconColor = isCritical ? theme.colors.error : theme.colors.gold;

  return (
    <Card
      padding="lg"
      elevation="sm"
      goldAccent={isHigh || isCritical}
      style={{ marginBottom: theme.spacing.md }}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: isCritical ? theme.colors.errorSoft : theme.colors.surface,
              borderColor: iconColor,
            },
          ]}
        >
          <Icon size={18} color={iconColor} strokeWidth={1.75} />
        </View>
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.ink,
              fontFamily: fonts.bodyBold,
              ...theme.typography.h3,
            },
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {isCritical && (
          <View style={[styles.criticalPill, { backgroundColor: theme.colors.error }]}>
            <Text
              style={{
                color: theme.colors.white,
                fontSize: 10,
                fontFamily: fonts.bodyBold,
                letterSpacing: 0.5,
              }}
            >
              !
            </Text>
          </View>
        )}
      </View>

      <Text
        style={[
          styles.body,
          {
            color: theme.colors.ink,
            fontFamily: fonts.body,
            ...theme.typography.body,
          },
        ]}
        {...(compact ? { numberOfLines: 3 } : {})}
      >
        {body}
      </Text>

      {announcement.voice_url ? (
        <View style={{ marginTop: 8 }}>
          <VoicePlayer
            url={announcement.voice_url}
            durationMs={announcement.voice_duration_ms ?? null}
          />
        </View>
      ) : null}

      {date ? (
        <View style={styles.dateRow}>
          <Calendar size={13} color={theme.colors.inkFaint} strokeWidth={1.75} />
          <Text
            style={{
              color: theme.colors.inkFaint,
              fontFamily: fonts.body,
              ...theme.typography.caption,
            }}
          >
            {date}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
  },
  criticalPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
