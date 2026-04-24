import { Router } from 'express';
import admin from 'firebase-admin';
import { pool } from '../db/pool';
import { requireCronSecret } from '../middleware/cron-auth';
import { sendAnnouncementToAll } from '../services/fcm';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// --- Send due scheduled announcements ---

router.post('/send-due', requireCronSecret, async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id FROM announcements
       WHERE status = 'scheduled' AND scheduled_for <= NOW()
       ORDER BY scheduled_for ASC`
    );
    const due = rows as Array<{ id: number }>;

    if (due.length === 0) {
      res.json({ message: 'No announcements due', sent: 0 });
      return;
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (const row of due) {
      try {
        const result = await sendAnnouncementToAll(row.id);
        totalSent += result.sent;
        totalFailed += result.failed;
        console.log(`[cron] Sent announcement ${row.id}: ${result.sent} sent, ${result.failed} failed`);
      } catch (err) {
        console.error(`[cron] Failed to send announcement ${row.id}:`, err);
      }
    }

    res.json({
      message: `Processed ${due.length} announcement(s)`,
      announcements: due.length,
      totalSent,
      totalFailed,
    });
  } catch (err) {
    console.error('[cron/send-due]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Cleanup stale device tokens ---
// Two passes:
//   1. Delete tokens whose device hasn't heartbeat in 14+ days (app likely uninstalled or unused).
//   2. Ask FCM (dry-run) whether every remaining token is still registered. Drop tokens that
//      FCM reports as 'registration-token-not-registered' or 'invalid-argument'. This catches
//      recent uninstalls within hours, not weeks.

router.post('/cleanup-tokens', requireCronSecret, async (_req, res) => {
  try {
    // --- Pass 1: time-based sweep ---
    const [staleResult] = await pool.execute(
      'DELETE FROM device_tokens WHERE last_seen < DATE_SUB(NOW(), INTERVAL 14 DAY)'
    );
    const staleDeleted = (staleResult as ResultSetHeader).affectedRows ?? 0;
    console.log(`[cron/cleanup] time-based pass: deleted ${staleDeleted} stale token(s) (>14d since last heartbeat)`);

    // --- Pass 2: FCM dry-run validation ---
    let invalidDeleted = 0;
    let validated = 0;
    try {
      const [rows] = await pool.execute('SELECT id, fcm_token FROM device_tokens');
      const tokens = (rows as Array<{ id: number; fcm_token: string }>);
      validated = tokens.length;

      if (tokens.length > 0) {
        console.log(`[cron/cleanup] FCM-validating ${tokens.length} remaining token(s)`);
        const invalid: string[] = [];

        // FCM allows dry-run per message. Use sendEachForMulticast with validateOnly (500 at a time).
        const CHUNK = 500;
        for (let i = 0; i < tokens.length; i += CHUNK) {
          const chunk = tokens.slice(i, i + CHUNK);
          const response = await admin.messaging().sendEachForMulticast(
            {
              tokens: chunk.map((t) => t.fcm_token),
              // Empty notification — dry-run doesn't deliver anyway
              notification: { title: 'validation', body: 'validation' },
            },
            /* dryRun */ true,
          );

          response.responses.forEach((resp, idx) => {
            if (resp.error) {
              const code = resp.error.code;
              if (
                code === 'messaging/invalid-registration-token' ||
                code === 'messaging/registration-token-not-registered' ||
                code === 'messaging/invalid-argument'
              ) {
                invalid.push(chunk[idx].fcm_token);
              }
            }
          });
        }

        if (invalid.length > 0) {
          const placeholders = invalid.map(() => '?').join(',');
          const [delResult] = await pool.execute(
            `DELETE FROM device_tokens WHERE fcm_token IN (${placeholders})`,
            invalid,
          );
          invalidDeleted = (delResult as ResultSetHeader).affectedRows ?? 0;
          console.log(`[cron/cleanup] FCM pass: deleted ${invalidDeleted} invalid/uninstalled token(s)`);
        } else {
          console.log(`[cron/cleanup] FCM pass: all ${tokens.length} token(s) still valid`);
        }
      }
    } catch (err) {
      // FCM validation is a best-effort enhancement; if it fails, we still did the time-based sweep
      console.error('[cron/cleanup] FCM validation failed (non-fatal):', err);
    }

    const totalDeleted = staleDeleted + invalidDeleted;
    console.log(`[cron/cleanup] TOTAL removed: ${totalDeleted} (${staleDeleted} stale + ${invalidDeleted} uninstalled); ${validated - invalidDeleted} token(s) remain`);

    res.json({
      message: `Removed ${totalDeleted} token(s)`,
      staleDeleted,
      invalidDeleted,
      remaining: Math.max(0, validated - invalidDeleted),
    });
  } catch (err) {
    console.error('[cron/cleanup-tokens]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
