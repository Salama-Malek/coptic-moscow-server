import React, { useCallback, useState } from 'react';
import { RefreshControl, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Sunrise, CalendarClock, BellRing, Inbox, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { getFontFamily, type Language } from '../theme/fonts';
import { Screen } from '../components/ui/Screen';
import { EmptyState } from '../components/ui/EmptyState';
import { getItem, setItem } from '../lib/storage';
import { expandEvents, ExpandedOccurrence } from '../lib/rrule';
import { fetchCalendar, fetchAnnouncements, CalendarEventData, AnnouncementData } from '../lib/api';
import { scheduleServiceReminders } from '../lib/notifications';
import CalendarEventCard from '../components/CalendarEventCard';
import AnnouncementCard from '../components/AnnouncementCard';
import CopticCross from '../components/CopticCross';
import FastingTile from '../components/FastingTile';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const lang = (i18n.language as Language) || 'ar';
  const fonts = getFontFamily(lang);

  const [todayEvents, setTodayEvents] = useState<ExpandedOccurrence[]>([]);
  const [nextEvent, setNextEvent] = useState<ExpandedOccurrence | null>(null);
  const [recentAnnouncements, setRecentAnnouncements] = useState<AnnouncementData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const applyCalendar = useCallback((events: CalendarEventData[]) => {
    const expanded = expandEvents(events);
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    setTodayEvents(expanded.filter((o) => o.date >= now && o.date <= todayEnd));
    setNextEvent(expanded.find((o) => o.date > now) || null);
  }, []);

  const loadFromCache = useCallback(async () => {
    const cachedCalendar = await getItem<CalendarEventData[]>('calendar');
    if (cachedCalendar) applyCalendar(cachedCalendar);
    const cachedInbox = await getItem<AnnouncementData[]>('inbox');
    if (cachedInbox) setRecentAnnouncements(cachedInbox.slice(0, 3));
  }, [applyCalendar]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [freshCalendar, freshInbox] = await Promise.all([
        fetchCalendar(),
        fetchAnnouncements(50),
      ]);
      if (freshCalendar) {
        await setItem('calendar', freshCalendar);
        applyCalendar(freshCalendar);
        await scheduleServiceReminders(expandEvents(freshCalendar));
      }
      if (freshInbox) {
        await setItem('inbox', freshInbox);
        setRecentAnnouncements(freshInbox.slice(0, 3));
      }
    } catch {
      // offline — cached data stays
    } finally {
      setRefreshing(false);
    }
  }, [applyCalendar]);

  // Refresh on focus + poll every 20s while the screen is visible.
  useFocusEffect(
    useCallback(() => {
      loadFromCache();
      refresh();
      const id = setInterval(refresh, 20000);
      return () => clearInterval(id);
    }, [loadFromCache, refresh]),
  );

  return (
    <Screen
      scrollable
      padded={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Hero header — cross + app name */}
      <View
        style={[
          styles.hero,
          {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
            gap: theme.spacing.md,
          },
        ]}
      >
        <CopticCross size={44} color={theme.colors.gold} />
        <View style={{ flex: 1 }}>
          <Text
            style={[
              {
                color: theme.colors.ink,
                fontFamily: fonts.heading,
                ...theme.typography.h1,
              },
            ]}
          >
            {t('app_name')}
          </Text>
          <View
            style={[
              styles.goldRule,
              { backgroundColor: theme.colors.gold, marginTop: 6 },
            ]}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        {/* Fasting status tile — taps through to full calendar */}
        <View style={{ marginBottom: theme.spacing.lg }}>
          <FastingTile />
        </View>

        {/* Today's services */}
        <SectionHeader
          icon={Sunrise}
          label={t('today_services')}
          color={theme.colors.primary}
          fontFamily={fonts.bodyBold}
        />
        {todayEvents.length > 0 ? (
          todayEvents.map((occ, i) => <CalendarEventCard key={i} occurrence={occ} />)
        ) : (
          <Text
            style={[
              styles.emptyLine,
              {
                color: theme.colors.inkMuted,
                fontFamily: fonts.body,
                ...theme.typography.body,
              },
            ]}
          >
            {t('no_services_today')}
          </Text>
        )}

        {/* Next upcoming */}
        {nextEvent && (
          <>
            <SectionHeader
              icon={CalendarClock}
              label={t('next_event')}
              color={theme.colors.primary}
              fontFamily={fonts.bodyBold}
            />
            <CalendarEventCard occurrence={nextEvent} />
          </>
        )}

        {/* Recent announcements */}
        <SectionHeader
          icon={BellRing}
          label={t('recent_announcements')}
          color={theme.colors.primary}
          fontFamily={fonts.bodyBold}
        />
        {recentAnnouncements.length > 0 ? (
          recentAnnouncements.map((a) => <AnnouncementCard key={a.id} announcement={a} compact />)
        ) : (
          <View style={{ marginTop: theme.spacing.sm }}>
            <EmptyState icon={Inbox} title={t('no_announcements')} />
          </View>
        )}
      </View>
    </Screen>
  );
}

type SectionHeaderProps = {
  icon: LucideIcon;
  label: string;
  color: string;
  fontFamily: string;
};

function SectionHeader({ icon: Icon, label, color, fontFamily }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Icon size={18} color={color} strokeWidth={1.75} />
      <Text style={[styles.sectionLabel, { color, fontFamily }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goldRule: {
    height: 2,
    width: 48,
    borderRadius: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  emptyLine: {
    paddingVertical: 16,
    textAlign: 'center',
  },
});
