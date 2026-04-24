/**
 * Notification layer.
 *
 * - Incoming FCM messages: received via @react-native-firebase/messaging.
 * - Display: built via @notifee/react-native, which supports BubbleMetadata
 *   (Android 11+ floating-bubble UX).
 * - Local service reminders: still scheduled via expo-notifications — it's
 *   simpler for recurring local alarms, no remote push involved.
 */

import notifee, {
  AndroidImportance,
  AndroidStyle,
  AndroidVisibility,
  AuthorizationStatus,
  EventType,
  type Notification,
  type Event,
} from '@notifee/react-native';
import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import i18n from './i18n';
import type { ExpandedOccurrence } from './rrule';

const CHANNEL_DEFAULT = 'default';
const CHANNEL_CRITICAL = 'critical';

// The "person" the bubble represents. MessagingStyle requires this; Android
// uses it to promote the notification to the Conversations section on Android 12+.
const PARISH_PERSON = {
  name: 'الكنيسة القبطية بموسكو',
  id: 'parish',
  important: true,
  icon: 'drawable://ic_launcher',
};

// Parish primary red — the status-bar icon accent color.
const ACCENT_COLOR = '#6B1A1A';

// =========================================================================
// Channel setup (Android only)
// =========================================================================

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await notifee.createChannel({
    id: CHANNEL_DEFAULT,
    name: 'Announcements',
    description: 'Parish announcements and service reminders',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
    vibration: true,
  });

  await notifee.createChannel({
    id: CHANNEL_CRITICAL,
    name: 'Critical',
    description: 'Urgent announcements — overrides Do Not Disturb',
    importance: AndroidImportance.HIGH,
    sound: 'bell',
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
    bypassDnd: true,
  });
}

// =========================================================================
// Permission (covers Android 13+ POST_NOTIFICATIONS + iOS)
// =========================================================================

export async function requestPermissions(): Promise<boolean> {
  const result = await notifee.requestPermission();
  return (
    result.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    result.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

// =========================================================================
// FCM device token
// =========================================================================

export async function getDevicePushToken(): Promise<string | null> {
  try {
    return await messaging().getToken();
  } catch (err) {
    console.warn('[notifications] messaging().getToken failed:', err);
    return null;
  }
}

// =========================================================================
// Display an announcement — MessagingStyle + BubbleMetadata
// =========================================================================

type AnnouncementPayload = {
  id: string;
  title: string;
  body: string;
  priority?: 'normal' | 'high' | 'critical';
  /** When set, notification gets a "Watch" action and body-tap opens this URL. */
  streamUrl?: string;
  /** When set, body is prefixed with 🎤 and voice_url is stored in notif data. */
  voiceUrl?: string;
};

export async function displayAnnouncement(p: AnnouncementPayload): Promise<void> {
  const priority = p.priority || 'normal';
  const channelId = priority === 'critical' ? CHANNEL_CRITICAL : CHANNEL_DEFAULT;
  const hasStream = typeof p.streamUrl === 'string' && p.streamUrl.length > 0;
  const hasVoice = typeof p.voiceUrl === 'string' && p.voiceUrl.length > 0;
  const displayBody = hasVoice ? `🎤 ${p.body}` : p.body;

  // Notifee's TypeScript types omit `bubble` and `shortcutId` even though the
  // underlying native runtime accepts them. We cast for those two fields only
  // so Android gets the metadata it needs to auto-bubble on Android 11+.
  const androidConfig = {
    channelId,
    smallIcon: 'ic_launcher',       // status bar icon
    largeIcon: 'drawable://ic_launcher', // big circular parish logo in the notif body
    color: ACCENT_COLOR,             // tints the small icon + accent line
    importance:
      priority === 'critical'
        ? AndroidImportance.HIGH
        : AndroidImportance.DEFAULT,
    visibility: AndroidVisibility.PUBLIC,
    showTimestamp: true,
    pressAction: {
      id: 'default',
      launchActivity: 'default',
    },
    // Link to our static shortcut (see mobile/plugins/with-app-shortcuts.js).
    // Android needs a ShortcutInfo to render a bubble — reusing the `inbox`
    // shortcut since the bubble expands to the Inbox tab via deep link.
    shortcutId: 'inbox',
    // MessagingStyle + Person = eligible for Conversation section + Bubbles.
    // Person has `icon` so the parish logo appears as the sender avatar.
    style: {
      type: AndroidStyle.MESSAGING,
      person: PARISH_PERSON,
      messages: [
        {
          text: displayBody,
          timestamp: Date.now(),
        },
      ],
    },
    // BubbleMetadata — Android 11+ shows as a floating bubble if the user has
    // bubbles enabled for this app (Settings → Apps → Coptic → Bubbles).
    bubble: {
      icon: 'drawable://ic_launcher',
      autoExpand: false,
      suppressNotification: false,
      desiredHeight: 600,
    },
    // Watch action — only shown when the announcement has a stream URL.
    // The id='watch' is picked up by onForeground/onBackgroundEvent below.
    ...(hasStream && {
      actions: [
        {
          title: i18n.t('notif_watch_action', { defaultValue: 'Watch' }),
          pressAction: { id: 'watch', launchActivity: 'default' },
        },
      ],
    }),
  };

  // notifee serializes `data` to strings; keep everything string-typed.
  const data: Record<string, string> = {
    type: 'announcement',
    announcementId: p.id,
  };
  if (hasStream) data.stream_url = p.streamUrl!;
  if (hasVoice) data.voice_url = p.voiceUrl!;

  const notification: Notification = {
    id: p.id,
    title: p.title,
    body: displayBody,
    data,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    android: androidConfig as any,
  };

  await notifee.displayNotification(notification);
}

// =========================================================================
// Notifee event handler — opens the stream URL when the user taps
// "Watch" (or the notification body if a stream URL is attached).
//
// Registered once at module scope (like the FCM background handler) so it
// works when the app is killed. Keep the function stable across reloads.
// =========================================================================

async function onNotificationEvent({ type, detail }: Event): Promise<void> {
  if (type !== EventType.ACTION_PRESS && type !== EventType.PRESS) return;
  const data = detail.notification?.data as Record<string, string> | undefined;
  const streamUrl = data?.stream_url;
  if (!streamUrl) return;

  // For the body-press path, only open the URL if the announcement actually has
  // one — otherwise fall through to the default launchActivity (app opens).
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id !== 'watch') return;

  try {
    const supported = await Linking.canOpenURL(streamUrl);
    if (supported) {
      await Linking.openURL(streamUrl);
    } else {
      console.warn('[notifications] cannot open stream URL:', streamUrl);
    }
  } catch (err) {
    console.warn('[notifications] openURL failed:', err);
  }
}

notifee.onBackgroundEvent(onNotificationEvent);

export function registerNotifeeForegroundHandler(): () => void {
  return notifee.onForegroundEvent(onNotificationEvent);
}

// =========================================================================
// Handle incoming FCM message (foreground + background)
// =========================================================================

export async function handleIncomingFcm(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): Promise<void> {
  const data = remoteMessage?.data;
  if (!data) return;

  // We only know how to render announcements right now. Anything else is ignored.
  if (data.type !== 'announcement') return;

  const priority = (data.priority || 'normal') as 'normal' | 'high' | 'critical';
  const streamUrl = typeof data.stream_url === 'string' ? data.stream_url : undefined;
  const voiceUrl = typeof data.voice_url === 'string' ? data.voice_url : undefined;
  await displayAnnouncement({
    id: String(data.id || data.announcementId || Date.now()),
    title: String(data.title || ''),
    body: String(data.body || ''),
    priority,
    streamUrl,
    voiceUrl,
  });
}

// =========================================================================
// Test notification (used from Settings screen)
// =========================================================================

export async function sendTestNotification(): Promise<void> {
  await displayAnnouncement({
    id: `test-${Date.now()}`,
    title: 'Test notification',
    body: 'If you can see this, notifications are working.',
    priority: 'normal',
  });
}

// =========================================================================
// Local service reminders — still expo-notifications (local only, no FCM)
// =========================================================================

export async function scheduleServiceReminders(
  occurrences: ExpandedOccurrence[],
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const occ of occurrences) {
    const reminderMinsBefore = occ.event.reminder_minutes_before;
    if (reminderMinsBefore <= 0) continue;

    const reminderTime = new Date(
      occ.date.getTime() - reminderMinsBefore * 60000,
    );
    if (reminderTime <= new Date()) continue;

    const title =
      occ.event.title_ar || occ.event.title_ru || occ.event.title_en || 'Service';
    const body = `Starting in ${reminderMinsBefore} minutes`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
      },
    });
  }
}
