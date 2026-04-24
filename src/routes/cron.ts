import { Router } from 'express';
import admin from 'firebase-admin';
import { pool } from '../db/pool';
import { requireCronSecret } from '../middleware/cron-auth';
import { sendAnnouncementToAll } from '../services/fcm';
import { logger } from '../lib/logger';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// --- Cron run tracker ---
// Records every invocation in cron_runs so the admin System Health page (OB7)
// can show "last run" + history, and operators can answer "did today's
// scheduled send actually execute?"

async function recordCronRun<T>(job: string, fn: () => Promise<T>): Promise<T> {
  const [insertRes] = await pool.execute(
    `INSERT INTO cron_runs (job, status) VALUES (?, 'running')`,
    [job]
  );
  const runId = (insertRes as ResultSetHeader).insertId;
  const start = Date.now();
  try {
    const result = await fn();
    const durationMs = Date.now() - start;
    await pool.execute(
      `UPDATE cron_runs
       SET finished_at = NOW(), duration_ms = ?, status = 'ok', result_json = ?
       WHERE id = ?`,
      [durationMs, JSON.stringify(result ?? null), runId]
    );
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    await pool.execute(
      `UPDATE cron_runs
       SET finished_at = NOW(), duration_ms = ?, status = 'error', error_message = ?
       WHERE id = ?`,
      [durationMs, message.slice(0, 65000), runId]
    );
    throw err;
  }
}

// --- Send due scheduled announcements ---

router.post('/send-due', requireCronSecret, async (_req, res) => {
  try {
    const result = await recordCronRun('send-due', async () => {
      const [rows] = await pool.execute(
        `SELECT id FROM announcements
         WHERE status = 'scheduled' AND scheduled_for <= NOW()
         ORDER BY scheduled_for ASC`
      );
      const due = rows as Array<{ id: number }>;

      if (due.length === 0) {
        return { message: 'No announcements due', announcements: 0, claimed: 0, skipped: 0, totalSent: 0, totalFailed: 0 };
      }

      let totalSent = 0;
      let totalFailed = 0;
      let claimed = 0;
      let skipped = 0;

      for (const row of due) {
        // Atomic claim: only one cron run can transition scheduled -> sending.
        // Overlapping runs see affectedRows = 0 and skip.
        const [claimResult] = await pool.execute(
          `UPDATE announcements SET status = 'sending'
           WHERE id = ? AND status = 'scheduled'`,
          [row.id]
        );
        if ((claimResult as ResultSetHeader).affectedRows === 0) {
          skipped++;
          logger.info({ announcementId: row.id }, '[cron] skipping — already claimed by another run');
          continue;
        }
        claimed++;

        try {
          const sendResult = await sendAnnouncementToAll(row.id);
          // markSent() flips sending -> sent on success.
          totalSent += sendResult.sent;
          totalFailed += sendResult.failed;
          logger.info({ announcementId: row.id, sent: sendResult.sent, failed: sendResult.failed }, '[cron] announcement dispatched');
        } catch (err) {
          logger.error({ err, announcementId: row.id }, '[cron] announcement dispatch failed');
          await pool.execute(
            `UPDATE announcements SET status = 'send_failed' WHERE id = ? AND status = 'sending'`,
            [row.id]
          );
        }
      }

      return {
        message: `Processed ${due.length} announcement(s)`,
        announcements: due.length,
        claimed,
        skipped,
        totalSent,
        totalFailed,
      };
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, '[cron/send-due] outer handler');
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
    const result = await recordCronRun('cleanup-tokens', async () => {
      // --- Pass 1: time-based sweep ---
      const [staleResult] = await pool.execute(
        'DELETE FROM device_tokens WHERE last_seen < DATE_SUB(NOW(), INTERVAL 14 DAY)'
      );
      const staleDeleted = (staleResult as ResultSetHeader).affectedRows ?? 0;
      logger.info({ staleDeleted }, '[cron/cleanup] time-based pass complete');

      // --- Pass 2: FCM dry-run validation ---
      let invalidDeleted = 0;
      let validated = 0;
      try {
        const [rows] = await pool.execute('SELECT id, fcm_token FROM device_tokens');
        const tokens = rows as Array<{ id: number; fcm_token: string }>;
        validated = tokens.length;

        if (tokens.length > 0) {
          logger.info({ count: tokens.length }, '[cron/cleanup] FCM-validating tokens');
          const invalid: string[] = [];

          const CHUNK = 500;
          for (let i = 0; i < tokens.length; i += CHUNK) {
            const chunk = tokens.slice(i, i + CHUNK);
            const response = await admin.messaging().sendEachForMulticast(
              {
                tokens: chunk.map((t) => t.fcm_token),
                notification: { title: 'validation', body: 'validation' },
              },
              /* dryRun */ true
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
              invalid
            );
            invalidDeleted = (delResult as ResultSetHeader).affectedRows ?? 0;
            logger.info({ invalidDeleted }, '[cron/cleanup] FCM pass deleted invalid tokens');
          } else {
            logger.info({ valid: tokens.length }, '[cron/cleanup] FCM pass: all tokens still valid');
          }
        }
      } catch (err) {
        // FCM validation is best-effort; time-based sweep already ran.
        logger.warn({ err }, '[cron/cleanup] FCM validation failed (non-fatal)');
      }

      const totalDeleted = staleDeleted + invalidDeleted;
      logger.info(
        { totalDeleted, staleDeleted, invalidDeleted, remaining: validated - invalidDeleted },
        '[cron/cleanup] complete'
      );

      return {
        message: `Removed ${totalDeleted} token(s)`,
        staleDeleted,
        invalidDeleted,
        remaining: Math.max(0, validated - invalidDeleted),
      };
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, '[cron/cleanup-tokens] outer handler');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
