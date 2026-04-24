import admin from 'firebase-admin';
import { pool } from '../db/pool';

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
    console.log(`[fcm] Firebase Admin initialized (project: ${serviceAccount.project_id})`);
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

// --- Logging helpers ---

function tokenPrefix(token: string): string {
  return token.length > 12 ? token.slice(0, 12) + '…' : token;
}

function logStep(announcementId: number, msg: string): void {
  console.log(`[fcm] [ann#${announcementId}] ${msg}`);
}

// --- Core send function ---

export async function sendAnnouncementToAll(announcementId: number): Promise<SendResult> {
  logStep(announcementId, 'sendAnnouncementToAll() started');

  if (!firebaseInitialized) {
    console.warn(`[fcm] [ann#${announcementId}] SKIPPED — Firebase not initialized. Check FIREBASE_SERVICE_ACCOUNT_PATH env var + file exists + chmod 600.`);
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  // 1. Fetch the announcement
  const [annRows] = await pool.execute(
    'SELECT id, title_ar, title_ru, title_en, body_ar, body_ru, body_en, priority, category FROM announcements WHERE id = ?',
    [announcementId]
  );
  const announcements = annRows as AnnouncementRow[];
  if (announcements.length === 0) {
    console.error(`[fcm] [ann#${announcementId}] NOT FOUND in DB — aborting send`);
    throw new Error(`Announcement ${announcementId} not found`);
  }
  const announcement = announcements[0];
  logStep(announcementId, `loaded: priority=${announcement.priority} category=${announcement.category} title_ar="${announcement.title_ar.slice(0, 40)}"`);

  // 2. Fetch device tokens filtered by category preference
  const prefKey = announcement.category === 'service' ? 'services' : 'announcements';
  const [tokenRows] = await pool.execute(
    `SELECT id, fcm_token, language FROM device_tokens
     WHERE JSON_EXTRACT(preferences, ?) = true`,
    [`$.${prefKey}`]
  );
  const devices = tokenRows as DeviceTokenRow[];
  logStep(announcementId, `found ${devices.length} device(s) subscribed to '${prefKey}'`);

  if (devices.length === 0) {
    logStep(announcementId, 'no target devices — marking sent with 0/0');
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
  const groupSummary = Array.from(byLanguage.entries())
    .map(([lang, toks]) => `${lang}=${toks.length}`)
    .join(' ');
  logStep(announcementId, `grouped by language: ${groupSummary}`);

  // 4. Send batches per language
  let totalSent = 0;
  let totalFailed = 0;
  const allInvalidTokens: string[] = [];

  for (const [lang, tokens] of byLanguage) {
    const title = getLocalizedField(announcement, 'title', lang);
    const body = getLocalizedField(announcement, 'body', lang);
    logStep(announcementId, `sending ${lang} batch: ${tokens.length} token(s), title="${title.slice(0, 40)}"`);

    const result = await sendBatch(announcementId, lang, tokens, title, body, announcement.priority);
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
    logStep(announcementId, `removed ${allInvalidTokens.length} invalid/stale token(s) from device_tokens`);
  }

  // 6. Update announcement and log
  await markSent(announcementId, totalSent, totalFailed);

  logStep(announcementId, `FINAL — sent=${totalSent} failed=${totalFailed} invalidCleaned=${allInvalidTokens.length}`);
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
  announcementId: number,
  lang: Language,
  tokens: string[],
  title: string,
  body: string,
  priority: 'normal' | 'high' | 'critical'
): Promise<SendResult> {
  let totalSent = 0;
  let totalFailed = 0;
  const invalidTokens: string[] = [];

  const CHUNK_SIZE = 500;
  for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
    const chunk = tokens.slice(i, i + CHUNK_SIZE);
    const chunkNo = Math.floor(i / CHUNK_SIZE) + 1;
    const chunkTotal = Math.ceil(tokens.length / CHUNK_SIZE);

    // Data-only payload: the mobile app builds exactly one notification per
    // FCM via @notifee. Hybrid payloads (notification + data) caused
    // duplicate displays on some Android versions. High FCM priority
    // guarantees delivery is not deferred by Doze.
    const message: admin.messaging.MulticastMessage = {
      tokens: chunk,
      data: {
        type: 'announcement',
        id: String(announcementId),
        title,
        body,
        priority,
      },
      android: buildAndroidConfig(priority),
      apns: buildApnsConfig(priority, title, body),
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      totalSent += response.successCount;
      totalFailed += response.failureCount;

      logStep(announcementId, `  [${lang}] chunk ${chunkNo}/${chunkTotal}: sent=${response.successCount} failed=${response.failureCount}`);

      // Log detailed errors per failed token
      response.responses.forEach((resp, idx) => {
        if (resp.error) {
          const code = resp.error.code;
          const tokenShort = tokenPrefix(chunk[idx]);
          logStep(announcementId, `    [${lang}] ERROR token=${tokenShort} code=${code} msg="${resp.error.message}"`);
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(chunk[idx]);
          }
        }
      });
    } catch (err) {
      // Batch-level failure (e.g. auth failure, network) — whole chunk lost
      totalFailed += chunk.length;
      logStep(announcementId, `  [${lang}] chunk ${chunkNo} THREW: ${(err as Error).message}`);
      console.error(`[fcm] [ann#${announcementId}] batch error:`, err);
    }
  }

  return { sent: totalSent, failed: totalFailed, invalidTokens };
}

function buildAndroidConfig(_priority: 'normal' | 'high' | 'critical'): admin.messaging.AndroidConfig {
  // Data-only + high FCM delivery priority. NO `notification` field so
  // Android never auto-displays — the app builds the notification itself
  // via notifee, giving us MessagingStyle + bubble-capable UX.
  return {
    priority: 'high',
    ttl: 24 * 60 * 60 * 1000, // 24h
  };
}

function buildApnsConfig(
  priority: 'normal' | 'high' | 'critical',
  title: string,
  body: string,
): admin.messaging.ApnsConfig {
  // iOS doesn't support bubbles; we keep the auto-display path by including
  // aps.alert. When the app adds proper Live Activities later, switch this.
  if (priority === 'critical') {
    return {
      payload: {
        aps: {
          alert: { title, body },
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
          alert: { title, body },
          sound: 'default',
        },
      },
      headers: {
        'apns-priority': '10',
      },
    };
  }
  return {
    payload: {
      aps: {
        alert: { title, body },
      },
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
