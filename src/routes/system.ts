import { Router } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireSuperAdmin } from '../middleware/auth';
import { isFirebaseInitialized } from '../services/fcm';
import { logger } from '../lib/logger';
import { RowDataPacket } from 'mysql2';

const router = Router();

// Single overview endpoint backs the admin System Health page. One roundtrip,
// one object — cheaper than six tile-specific endpoints and keeps the page
// consistent (no partial-render race when one tile's request is slow).

interface DbRow extends RowDataPacket {
  [k: string]: unknown;
}

router.get('/overview', requireAuth, requireSuperAdmin, async (_req, res) => {
  // --- DB status (this request proves it's up, so just record) ---
  const dbStart = Date.now();
  await pool.execute('SELECT 1 AS ok');
  const dbMs = Date.now() - dbStart;

  // --- Recent cron runs (last 5 per job) ---
  // UNION of top 5 send-due + top 5 cleanup-tokens so operators can confirm
  // both are running on schedule without scrolling.
  const [cronRows] = await pool.execute<DbRow[]>(`
    (SELECT id, job, started_at, finished_at, duration_ms, status, error_message
     FROM cron_runs WHERE job = 'send-due'
     ORDER BY started_at DESC LIMIT 5)
    UNION ALL
    (SELECT id, job, started_at, finished_at, duration_ms, status, error_message
     FROM cron_runs WHERE job = 'cleanup-tokens'
     ORDER BY started_at DESC LIMIT 5)
  `);

  // --- Device stats ---
  const [deviceRows] = await pool.execute<DbRow[]>(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN last_seen >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS active_7d,
      SUM(CASE WHEN last_seen >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) AS active_1d,
      SUM(CASE WHEN language = 'ar' THEN 1 ELSE 0 END) AS lang_ar,
      SUM(CASE WHEN language = 'ru' THEN 1 ELSE 0 END) AS lang_ru,
      SUM(CASE WHEN language = 'en' THEN 1 ELSE 0 END) AS lang_en
    FROM device_tokens
  `);

  // --- Delivery stats (today + 7d) ---
  const [deliveryRows] = await pool.execute<DbRow[]>(`
    SELECT
      COALESCE(SUM(CASE WHEN a.sent_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN sl.sent_count END), 0) AS delivered_1d,
      COALESCE(SUM(CASE WHEN a.sent_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN sl.failed_count END), 0) AS failed_1d,
      COALESCE(SUM(CASE WHEN a.sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN sl.sent_count END), 0) AS delivered_7d,
      COALESCE(SUM(CASE WHEN a.sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN sl.failed_count END), 0) AS failed_7d
    FROM send_log sl
    INNER JOIN announcements a ON a.id = sl.announcement_id
  `);

  // --- Recent send_failed announcements (retry-able) ---
  const [failedRows] = await pool.execute<DbRow[]>(`
    SELECT a.id, a.title_ar, a.title_ru, a.title_en, a.priority, a.created_at,
           adm.display_name AS created_by_name
    FROM announcements a
    LEFT JOIN admins adm ON adm.id = a.created_by
    WHERE a.status = 'send_failed'
    ORDER BY a.created_at DESC
    LIMIT 10
  `);

  // --- Recent admin audit log ---
  const [auditRows] = await pool.execute<DbRow[]>(`
    SELECT al.id, al.admin_id, al.action, al.target_type, al.target_id,
           al.created_at, adm.display_name AS admin_name
    FROM admin_audit_log al
    LEFT JOIN admins adm ON adm.id = al.admin_id
    ORDER BY al.created_at DESC
    LIMIT 15
  `);

  res.json({
    checked_at: new Date().toISOString(),
    db: { ok: true, ms: dbMs },
    firebase: { ok: isFirebaseInitialized() },
    cron_runs: cronRows,
    device_stats: deviceRows[0] ?? {},
    delivery: deliveryRows[0] ?? {},
    recent_failures: failedRows,
    recent_audit: auditRows,
  });
});

export default router;
