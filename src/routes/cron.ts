import { Router } from 'express';
import { pool } from '../db/pool';
import { requireCronSecret } from '../middleware/cron-auth';
import { sendAnnouncementToAll } from '../services/fcm';
import { RowDataPacket } from 'mysql2';

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

router.post('/cleanup-tokens', requireCronSecret, async (_req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM device_tokens WHERE last_seen < DATE_SUB(NOW(), INTERVAL 60 DAY)'
    );
    const deleted = (result as RowDataPacket).affectedRows as number;

    console.log(`[cron] Cleaned up ${deleted} stale device token(s).`);
    res.json({ message: `Removed ${deleted} stale token(s)`, deleted });
  } catch (err) {
    console.error('[cron/cleanup-tokens]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
