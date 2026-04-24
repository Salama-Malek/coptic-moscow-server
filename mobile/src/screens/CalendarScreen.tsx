import React, { useCallback, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarDays } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../components/ui/Screen';
import { EmptyState } from '../components/ui/EmptyState';
import { getItem, setItem } from '../lib/storage';
import { expandEvents, ExpandedOccurrence } from '../lib/rrule';
import { fetchCalendar, CalendarEventData } from '../lib/api';
import { scheduleServiceReminders } from '../lib/notifications';
import CalendarEventCard from '../components/CalendarEventCard';

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [occurrences, setOccurrences] = useState<ExpandedOccurrence[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const applyEvents = useCallback((events: CalendarEventData[]) => {
    setOccurrences(expandEvents(events, 30));
  }, []);

  // Load cached events immediately for fast paint
  const loadFromCache = useCallback(async () => {
    const cached = await getItem<CalendarEventData[]>('calendar');
    if (cached) applyEvents(cached);
  }, [applyEvents]);

  // Fetch fresh from server, update cache + local reminders
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await fetchCalendar();
      if (fresh && fresh.length >= 0) {
        await setItem('calendar', fresh);
        applyEvents(fresh);
        // Cancel stale reminders and reschedule based on the fresh list —
        // this is what makes admin deletions/edits disappear locally.
        const occ = expandEvents(fresh);
        await scheduleServiceReminders(occ);
      }
    } catch {
      // offline — cached events stay
    } finally {
      setRefreshing(false);
    }
  }, [applyEvents]);

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
      title={t('upcoming_30_days')}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {occurrences.length > 0 ? (
        occurrences.map((occ, i) => <CalendarEventCard key={i} occurrence={occ} />)
      ) : (
        <View style={{ marginTop: theme.spacing.lg }}>
          <EmptyState icon={CalendarDays} title={t('no_events')} />
        </View>
      )}
    </Screen>
  );
}
