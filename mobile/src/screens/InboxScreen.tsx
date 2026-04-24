import React, { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Inbox } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../components/ui/Screen';
import { EmptyState } from '../components/ui/EmptyState';
import { getItem, setItem } from '../lib/storage';
import { fetchAnnouncements, AnnouncementData } from '../lib/api';
import AnnouncementCard from '../components/AnnouncementCard';

export default function InboxScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadFromCache = useCallback(async () => {
    const cached = await getItem<AnnouncementData[]>('inbox');
    if (cached) setAnnouncements(cached);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchAnnouncements(50);
      if (data) {
        setAnnouncements(data);
        await setItem('inbox', data);
      }
    } catch {
      // offline — use cached data
    } finally {
      setRefreshing(false);
    }
  }, []);

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
      title={t('inbox')}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {announcements.length > 0 ? (
        announcements.map((a) => <AnnouncementCard key={a.id} announcement={a} />)
      ) : (
        <EmptyState icon={Inbox} title={t('no_announcements')} />
      )}
    </Screen>
  );
}
