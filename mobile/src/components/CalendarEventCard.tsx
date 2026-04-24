import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { getFontFamily, type Language } from '../theme/fonts';
import {
  formatMoscowTime,
  moscowDayOfMonth,
  moscowMonthShort,
  moscowWeekdayLong,
} from '../lib/datetime';
import type { ExpandedOccurrence } from '../lib/rrule';

interface Props {
  occurrence: ExpandedOccurrence;
}

export default function CalendarEventCard({ occurrence }: Props) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const lang = i18n.language as Language;
  const fonts = getFontFamily(lang);
  const { event, date } = occurrence;

  const title =
    lang === 'ru'
      ? event.title_ru || event.title_ar
      : lang === 'en'
      ? event.title_en || event.title_ar
      : event.title_ar;

  const dayStr = moscowDayOfMonth(date) ?? '';
  const monthStr = moscowMonthShort(date, lang);
  const dateStr = moscowWeekdayLong(date, lang);
  const timeStr = event.duration_minutes > 0 ? formatMoscowTime(date, lang) : '';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          ...theme.shadows.sm,
        },
      ]}
    >
      <View
        style={[
          styles.dateColumn,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <Text
          style={[
            styles.dayNumber,
            { color: theme.colors.gold, fontFamily: fonts.heading },
          ]}
        >
          {dayStr}
        </Text>
        <Text
          style={[
            styles.month,
            { color: theme.colors.white, fontFamily: fonts.bodyBold },
          ]}
        >
          {monthStr}
        </Text>
      </View>

      <View style={styles.content}>
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
        <Text
          style={[
            styles.meta,
            { color: theme.colors.inkMuted, fontFamily: fonts.body },
          ]}
        >
          {dateStr}
        </Text>
        {timeStr ? (
          <View style={styles.timeRow}>
            <Clock size={13} color={theme.colors.inkFaint} strokeWidth={1.75} />
            <Text
              style={[
                styles.time,
                { color: theme.colors.inkFaint, fontFamily: fonts.body },
              ]}
            >
              {timeStr}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dateColumn: {
    width: 64,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dayNumber: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
  },
  month: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  title: {
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  time: {
    fontSize: 13,
  },
});
