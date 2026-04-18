import admin from 'firebase-admin';
import { pool } from '../db/pool';
import { RowDataPacket } from 'mysql2';

// --- Initialize Firebase Admin ---

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
let firebaseInitialized = false;

export function initFirebase(): void {
  if (firebaseInitialized) return;
  if (!serviceAccountPath) {
    console.warn('[fcm] FIREBASE_SERVICE_ACCOUNT_PATH not set — push notifications disabled.');
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('[fcm] Firebase Admin initialized.');
  } catch (err) {
    console.error('[fcm] Failed to initialize Firebase Admin:', err);
  }
}

// --- Types ---

interface AnnouncementRow {
  id: number;
  title_ar: string;
  title_ru: string | null;
  title_en: string | null;
  body_ar: string;
  body_ru: string | null;
  body_en: string | null;
  priority: 'normal' | 'high' | 'critical';
  category: 'service' | 'announcement';
}

interface DeviceTokenRow {
  id: number;
  fcm_token: string;
  language: 'ar' | 'ru' | 'en';
}

interface SendResult {
  sent: number;
  failed: number;
  invalidTokens: string[];
}

type Language = 'ar' | 'ru' | 'en';

// --- Core send function ---

export async function sendAnnouncementToAll(announcementId: number): Promise<SendResult> {
  if (!firebaseInitialized) {
    console.warn('[fcm] Firebase not initialized — skipping send.');
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  // 1. Fetch the announcement
  const [annRows] = await pool.execute(
    'SELECT id, title_ar, title_ru, title_en, body_ar, body_ru, body_en, priority, category FROM announcements WHERE id = ?',
    [announcementId]
  );
  const announcements = annRows as AnnouncementRow[];
  if (announcements.length === 0) {
    throw new Error(`Announcement ${announcementId} not found`);
  }
  const announcement = announcements[0];

  // 2. Fetch device tokens filtered by category preference
  const prefKey = announcement.category === 'service' ? 'services' : 'announcements';
  const [tokenRows] = await pool.execute(
    `SELECT id, fcm_token, language FROM device_tokens
     WHERE JSON_EXTRACT(preferences, ?) = true`,
    [`$.${prefKey}`]
  );
  const devices = tokenRows as DeviceTokenRow[];

  if (devices.length === 0) {
    // No devices to send to — still mark as sent
    await markSent(announcementId, 0, 0);
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  // 3. Group tokens by language
  const byLanguage = new Map<Language, string[]>();
  for (const device of devices) {
    const lang = device.language;
    if (!byLanguage.has(lang)) byLanguage.set(lang, []);
    byLanguage.get(lang)!.push(device.fcm_token);
  }

  // 4. Send batches per language
  let totalSent = 0;
  let totalFailed = 0;
  const allInvalidTokens: string[] = [];

  for (const [lang, tokens] of byLanguage) {
    const title = getLocalizedField(announcement, 'title', lang);
    const body = getLocalizedField(announcement, 'body', lang);

    const result = await sendBatch(tokens, title, body, announcement.priority);
    totalSent += result.sent;
    totalFailed += result.failed;
    allInvalidTokens.push(...result.invalidTokens);
  }

  // 5. Clean up invalid tokens
  if (allInvalidTokens.length > 0) {
    const placeholders = allInvalidTokens.map(() => '?').join(',');
    await pool.execute(
      `DELETE FROM device_tokens WHERE fcm_token IN (${placeholders})`,
      allInvalidTokens
    );
    console.log(`[fcm] Removed ${allInvalidTokens.length} invalid token(s).`);
  }

  // 6. Update announcement and log
  await markSent(announcementId, totalSent, totalFailed);

  return { sent: totalSent, failed: totalFailed, invalidTokens: allInvalidTokens };
}

// --- Helpers ---

function getLocalizedField(
  announcement: AnnouncementRow,
  field: 'title' | 'body',
  lang: Language
): string {
  if (lang === 'ru') {
    return (field === 'title' ? announcement.title_ru : announcement.body_ru) || getLocalizedField(announcement, field, 'ar');
  }
  if (lang === 'en') {
    return (field === 'title' ? announcement.title_en : announcement.body_en) || getLocalizedField(announcement, field, 'ar');
  }
  // Arabic is the fallback
  return field === 'title' ? announcement.title_ar : announcement.body_ar;
}

async function sendBatch(
  tokens: string[],
  title: string,
  body: string,
  priority: 'normal' | 'high' | 'critical'
): Promise<SendResult> {
  let totalSent = 0;
  let totalFailed = 0;
  const invalidTokens: string[] = [];

  // Chunk tokens into batches of 500
  const CHUNK_SIZE = 500;
  for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
    const chunk = tokens.slice(i, i + CHUNK_SIZE);

    const message: admin.messaging.MulticastMessage = {
      tokens: chunk,
      notification: { title, body },
      android: buildAndroidConfig(priority),
      apns: buildApnsConfig(priority),
      data: {
        title_ar: title,
        body_ar: body,
        priority,
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    totalSent += response.successCount;
    totalFailed += response.failureCount;

    // Collect invalid tokens
    response.responses.forEach((resp, idx) => {
      if (resp.error) {
        const code = resp.error.code;
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(chunk[idx]);
        }
      }
    });
  }

  return { sent: totalSent, failed: totalFailed, invalidTokens };
}

function buildAndroidConfig(priority: 'normal' | 'high' | 'critical'): admin.messaging.AndroidConfig {
  if (priority === 'critical') {
    return {
      priority: 'high',
      notification: {
        channelId: 'critical',
        sound: 'bell',
        priority: 'max',
      },
    };
  }
  if (priority === 'high') {
    return {
      priority: 'high',
      notification: {
        channelId: 'default',
        sound: 'default',
        priority: 'high',
      },
    };
  }
  // normal
  return {
    priority: 'normal',
    notification: {
      channelId: 'default',
    },
  };
}

function buildApnsConfig(priority: 'normal' | 'high' | 'critical'): admin.messaging.ApnsConfig {
  if (priority === 'critical') {
    return {
      payload: {
        aps: {
          sound: {
            name: 'bell.caf',
            critical: true,
            volume: 1.0,
          },
          'interruption-level': 'time-sensitive',
        },
      },
      headers: {
        'apns-priority': '10',
      },
    };
  }
  if (priority === 'high') {
    return {
      payload: {
        aps: {
          sound: 'default',
        },
      },
      headers: {
        'apns-priority': '10',
      },
    };
  }
  // normal
  return {
    payload: {
      aps: {},
    },
    headers: {
      'apns-priority': '5',
    },
  };
}

async function markSent(announcementId: number, sentCount: number, failedCount: number): Promise<void> {
  await pool.execute(
    'UPDATE announcements SET sent_at = NOW(), status = ? WHERE id = ?',
    ['sent', announcementId]
  );
  await pool.execute(
    'INSERT INTO send_log (announcement_id, sent_count, failed_count) VALUES (?, ?, ?)',
    [announcementId, sentCount, failedCount]
  );
}
