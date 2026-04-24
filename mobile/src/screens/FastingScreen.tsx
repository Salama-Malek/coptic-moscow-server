import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { getFontFamily, type Language } from '../theme/fonts';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { formatMoscowDate } from '../lib/datetime';
import {
  getFastingDay,
  monthRange,
  type FastType,
  type FastingDay,
} from '../lib/fasting';

export default function FastingScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const lang = (i18n.language as Language) || 'ar';
  const fonts = getFontFamily(lang);

  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [selected, setSelected] = useState<Date>(() => new Date());

  const { weeks } = useMemo(() => monthRange(cursor), [cursor]);
  const selectedDay = useMemo(() => getFastingDay(selected), [selected]);
  const todayDay = useMemo(() => getFastingDay(new Date()), []);

  const labelFor = (fd: FastingDay): string =>
    fd.feastKey ? t(fd.feastKey) : t(`fast_period_${fd.period}`);

  const monthLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : lang === 'ru' ? 'ru-RU' : 'en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Moscow',
    });
    return fmt.format(cursor);
  }, [cursor, lang]);

  const shiftMonth = (delta: number): void => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  };

  const weekdayLabels = useMemo(() => {
    const ref = new Date(2023, 0, 1); // Sunday
    const fmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : lang === 'ru' ? 'ru-RU' : 'en-US', {
      weekday: 'short',
      timeZone: 'Europe/Moscow',
    });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(ref.getTime() + i * 86_400_000)));
  }, [lang]);

  return (
    <Screen scrollable padded>
      {/* Today tile */}
      <Card
        elevation="sm"
        padding="lg"
        goldAccent={todayDay.type !== 'none'}
        style={{ marginBottom: theme.spacing.lg }}
      >
        <Text
          style={[
            styles.todayKicker,
            { color: theme.colors.inkMuted, fontFamily: fonts.body },
          ]}
        >
          {t('fasting_today')}
        </Text>
        <Text
          style={[
            { color: theme.colors.ink, fontFamily: fonts.heading, ...theme.typography.h2, marginTop: 4 },
          ]}
        >
          {labelFor(todayDay)}
        </Text>
        <View style={{ marginTop: theme.spacing.sm }}>
          <FastChip type={todayDay.type} label={t(`fast_type_${todayDay.type}`)} />
        </View>
      </Card>

      {/* Month header */}
      <View style={styles.monthHeader}>
        <Pressable
          onPress={() => shiftMonth(-1)}
          hitSlop={12}
          accessibilityLabel={t('fasting_prev_month')}
        >
          <ChevronLeft size={24} color={theme.colors.primary} />
        </Pressable>
        <Text
          style={[
            { color: theme.colors.ink, fontFamily: fonts.heading, ...theme.typography.h3 },
          ]}
        >
          {monthLabel}
        </Text>
        <Pressable
          onPress={() => shiftMonth(1)}
          hitSlop={12}
          accessibilityLabel={t('fasting_next_month')}
        >
          <ChevronRight size={24} color={theme.colors.primary} />
        </Pressable>
      </View>

      {/* Weekday header row */}
      <View style={styles.weekRow}>
        {weekdayLabels.map((w, i) => (
          <Text
            key={i}
            style={[
              styles.weekdayLabel,
              { color: theme.colors.inkMuted, fontFamily: fonts.body },
            ]}
          >
            {w}
          </Text>
        ))}
      </View>

      {/* Month grid */}
      <View style={{ marginBottom: theme.spacing.lg }}>
        {weeks.map((row, ri) => (
          <View key={ri} style={styles.weekRow}>
            {row.map((d) => {
              const fd = getFastingDay(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = sameDay(d, new Date());
              const isSelected = sameDay(d, selected);
              return (
                <DayCell
                  key={d.toISOString()}
                  date={d}
                  fast={fd}
                  inMonth={inMonth}
                  isToday={isToday}
                  isSelected={isSelected}
                  onPress={() => setSelected(d)}
                  theme={theme}
                />
              );
            })}
          </View>
        ))}
      </View>

      {/* Selected-day detail */}
      <Card elevation="none" padding="md" style={{ marginBottom: theme.spacing.lg }}>
        <Text
          style={[
            styles.detailDate,
            { color: theme.colors.inkMuted, fontFamily: fonts.body },
          ]}
        >
          {formatMoscowDate(selected.toISOString(), lang)}
        </Text>
        <Text
          style={[
            { color: theme.colors.ink, fontFamily: fonts.bodyBold, ...theme.typography.body, marginTop: 4 },
          ]}
        >
          {labelFor(selectedDay)}
        </Text>
        <View style={{ marginTop: theme.spacing.sm }}>
          <FastChip type={selectedDay.type} label={t(`fast_type_${selectedDay.type}`)} />
        </View>
      </Card>

      {/* Legend */}
      <Text
        style={[
          styles.legendHeading,
          { color: theme.colors.inkMuted, fontFamily: fonts.bodyBold },
        ]}
      >
        {t('fasting_legend')}
      </Text>
      <View style={styles.legendRow}>
        {(['strict', 'wine_oil', 'fish', 'none'] as const).map((tp) => (
          <View key={tp} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: colorFor(tp, theme) }]} />
            <Text style={[{ color: theme.colors.ink, fontFamily: fonts.body, ...theme.typography.bodySmall }]}>
              {t(`fast_type_${tp}`)}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

// --- Helpers ---

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type ThemeLike = {
  colors: {
    primary: string;
    gold: string;
    ink: string;
    inkMuted: string;
    parchment: string;
    border: string;
    error?: string;
  };
  spacing: Record<string, number>;
};

function colorFor(type: FastType, theme: ThemeLike): string {
  switch (type) {
    case 'strict':
      // Stronger tone — matches the theme's primary accent.
      return theme.colors.primary;
    case 'wine_oil':
      return theme.colors.gold;
    case 'fish':
      return '#9ab28a'; // muted sage — keeps brand warmth without adding a new theme token
    case 'none':
    default:
      return theme.colors.border;
  }
}

// --- Inner components ---

interface DayCellProps {
  date: Date;
  fast: FastingDay;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  onPress: () => void;
  theme: ThemeLike;
}

function DayCell({ date, fast, inMonth, isToday, isSelected, onPress, theme }: DayCellProps) {
  const swatch = colorFor(fast.type, theme);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.dayCell,
        {
          backgroundColor: isSelected ? theme.colors.gold + '33' : 'transparent',
          borderColor: isToday ? theme.colors.primary : 'transparent',
        },
      ]}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.dayNumber,
          {
            color: inMonth ? theme.colors.ink : theme.colors.inkMuted,
            opacity: inMonth ? 1 : 0.35,
            fontWeight: isToday ? '700' : '500',
          },
        ]}
      >
        {date.getDate()}
      </Text>
      {fast.type !== 'none' && (
        <View style={[styles.daySwatch, { backgroundColor: swatch }]} />
      )}
    </Pressable>
  );
}

function FastChip({ type, label }: { type: FastType; label: string }) {
  const palette =
    type === 'strict'
      ? { bg: '#f5e6cc', fg: '#7a4f1a' }
      : type === 'wine_oil'
      ? { bg: '#f3e7b8', fg: '#6b5420' }
      : type === 'fish'
      ? { bg: '#d9e6cc', fg: '#3f5a36' }
      : { bg: '#e8e4da', fg: '#4a4a42' };
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }]}>
      <Text style={{ color: palette.fg, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  todayKicker: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingVertical: 6,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    margin: 1,
    position: 'relative',
  },
  dayNumber: {
    fontSize: 14,
  },
  daySwatch: {
    position: 'absolute',
    bottom: 5,
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  detailDate: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  legendHeading: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
