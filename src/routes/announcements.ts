import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sensitiveActionLimiter } from '../middleware/ratelimit';
import { logAudit } from '../services/audit';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { sendAnnouncementToAll } from '../services/fcm';

const router = Router();

// --- Schemas ---

// Body .max(4000) caps FCM payload size and prevents DoS; title matches DB VARCHAR(200).
// stream_url is optional — when set, mobile shows a "Watch" action that opens the URL.
const createAnnouncementSchema = z.object({
  title_ar: z.string().min(1).max(200),
  title_ru: z.string().max(200).optional(),
  title_en: z.string().max(200).optional(),
  body_ar: z.string().min(1).max(4000),
  body_ru: z.string().max(4000).optional(),
  body_en: z.string().max(4000).optional(),
  priority: z.enum(['normal', 'high', 'critical']).default('normal'),
  category: z.enum(['service', 'announcement']).default('announcement'),
  scheduled_for: z.string().datetime({ offset: true }).optional().nullable(),
  template_id: z.number().int().positive().optional().nullable(),
  stream_url: z.string().url().max(500).optional().nullable(),
  // Relative path like /uploads/announcements/{uuid}.m4a, or absolute https URL.
  // Voice upload endpoint returns a relative path; permissive schema accepts either.
  voice_url: z.string().min(1).max(500).optional().nullable(),
  voice_duration_ms: z.number().int().min(0).max(5 * 60 * 1000).optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'sent']).optional(),
});

const updateAnnouncementSchema = z.object({
  title_ar: z.string().min(1).max(200).optional(),
  title_ru: z.string().max(200).nullable().optional(),
  title_en: z.string().max(200).nullable().optional(),
  body_ar: z.string().min(1).max(4000).optional(),
  body_ru: z.string().max(4000).nullable().optional(),
  body_en: z.string().max(4000).nullable().optional(),
  priority: z.enum(['normal', 'high', 'critical']).optional(),
  category: z.enum(['service', 'announcement']).optional(),
  scheduled_for: z.string().datetime({ offset: true }).nullable().optional(),
  stream_url: z.string().url().max(500).nullable().optional(),
  voice_url: z.string().min(1).max(500).nullable().optional(),
  voice_duration_ms: z.number().int().min(0).max(5 * 60 * 1000).nullable().optional(),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// --- Public: list announcements ---

router.get('/', validate(listQuerySchema, 'query'), async (req, res) => {
  try {
    const { limit } = req.query as unknown as z.infer<typeof listQuerySchema>;

    const [rows] = await pool.query(
      `SELECT id, title_ar, title_ru, title_en, body_ar, body_ru, body_en,
              priority, category, stream_url, voice_url, voice_duration_ms,
              sent_at, created_at
       FROM announcements
       WHERE status = 'sent' AND sent_at IS NOT NULL
       ORDER BY sent_at DESC LIMIT ?`,
      [limit]
    );

    res.json(rows);
  } catch (err) {
    console.error('[announcements/list]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Admin: list all announcements (including drafts, scheduled) ---

router.get('/admin', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit || '50'), 10);

    const [rows] = await pool.query(
      `SELECT a.id, a.title_ar, a.title_ru, a.title_en, a.body_ar, a.body_ru, a.body_en,
              a.priority, a.category, a.status, a.scheduled_for, a.sent_at, a.created_at,
              a.created_by, a.stream_url, a.voice_url, a.voice_duration_ms,
              adm.display_name as created_by_name,
              sl.sent_count, sl.failed_count
       FROM announcements a
       LEFT JOIN admins adm ON adm.id = a.created_by
       LEFT JOIN send_log sl ON sl.announcement_id = a.id
       ORDER BY a.created_at DESC LIMIT ?`,
      [limit]
    );

    res.json(rows);
  } catch (err) {
    console.error('[announcements/admin/list]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Admin: fetch single announcement by id (used by Edit modal to load fresh data) ---

router.get('/admin/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: { code: 'BAD_ID', message: 'Invalid id' } });
      return;
    }

    const [rows] = await pool.execute(
      `SELECT a.id, a.title_ar, a.title_ru, a.title_en, a.body_ar, a.body_ru, a.body_en,
              a.priority, a.category, a.status, a.scheduled_for, a.sent_at, a.created_at,
              a.created_by, a.stream_url, a.voice_url, a.voice_duration_ms,
              adm.display_name as created_by_name,
              sl.sent_count, sl.failed_count
       FROM announcements a
       LEFT JOIN admins adm ON adm.id = a.created_by
       LEFT JOIN send_log sl ON sl.announcement_id = a.id
       WHERE a.id = ?`,
      [id]
    );
    const list = rows as RowDataPacket[];
    if (list.length === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Announcement not found' } });
      return;
    }
    res.json(list[0]);
  } catch (err) {
    console.error('[announcements/admin/get]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Admin: create announcement ---

router.post('/admin', requireAuth, sensitiveActionLimiter, validate(createAnnouncementSchema), async (req, res) => {
  try {
    const data = req.body as z.infer<typeof createAnnouncementSchema>;
    const adminId = req.admin!.adminId;

    // Determine INSERT status. For immediate-send we insert as 'sending' so a
    // silent FCM failure can never leave a row stuck at 'sent' with no push delivered.
    // markSent() inside sendAnnouncementToAll flips sending -> sent on success.
    let insertStatus: string;
    let isImmediateSend = false;
    if (data.status === 'draft') {
      insertStatus = 'draft';
    } else if (data.scheduled_for) {
      insertStatus = 'scheduled';
    } else {
      insertStatus = 'sending';
      isImmediateSend = true;
    }

    const [result] = await pool.execute(
      `INSERT INTO announcements
        (title_ar, title_ru, title_en, body_ar, body_ru, body_en, priority, category, status, scheduled_for, template_id, stream_url, voice_url, voice_duration_ms, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title_ar,
        data.title_ru ?? null,
        data.title_en ?? null,
        data.body_ar,
        data.body_ru ?? null,
        data.body_en ?? null,
        data.priority,
        data.category,
        insertStatus,
        data.scheduled_for ?? null,
        data.template_id ?? null,
        data.stream_url ?? null,
        data.voice_url ?? null,
        data.voice_duration_ms ?? null,
        adminId,
      ]
    );
    const insertId = (result as ResultSetHeader).insertId;

    await logAudit({
      adminId,
      action: insertStatus === 'draft' ? 'create_draft' : insertStatus === 'scheduled' ? 'schedule_announcement' : 'send_announcement',
      targetType: 'announcement',
      targetId: insertId,
      ip: req.ip,
    });

    let finalStatus: string = insertStatus;
    if (isImmediateSend) {
      try {
        await sendAnnouncementToAll(insertId);
        finalStatus = 'sent';
      } catch (fcmErr) {
        console.error('[announcements/send] FCM send failed:', fcmErr);
        await pool.execute(
          `UPDATE announcements SET status = 'send_failed' WHERE id = ? AND status = 'sending'`,
          [insertId]
        );
        finalStatus = 'send_failed';
      }
    }

    res.status(201).json({ id: insertId, status: finalStatus });
  } catch (err) {
    console.error('[announcements/admin/create]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Admin: update announcement (allowed at any stage, including after send) ---

router.put('/admin/:id', requireAuth, validate(updateAnnouncementSchema), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const data = req.body as z.infer<typeof updateAnnouncementSchema>;

    const [existing] = await pool.execute(
      'SELECT id, status FROM announcements WHERE id = ?',
      [id]
    );
    if ((existing as RowDataPacket[]).length === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Announcement not found' } });
      return;
    }

    // Build dynamic UPDATE from only the fields the client provided
    const fields: string[] = [];
    const values: Array<string | number | null> = [];
    const colMap: Record<string, keyof typeof data> = {
      title_ar: 'title_ar',
      title_ru: 'title_ru',
      title_en: 'title_en',
      body_ar: 'body_ar',
      body_ru: 'body_ru',
      body_en: 'body_en',
      priority: 'priority',
      category: 'category',
      scheduled_for: 'scheduled_for',
      stream_url: 'stream_url',
      voice_url: 'voice_url',
      voice_duration_ms: 'voice_duration_ms',
    };
    for (const col of Object.keys(colMap)) {
      const key = colMap[col];
      const val = data[key];
      if (val !== undefined) {
        fields.push(`${col} = ?`);
        values.push(val as string | number | null);
      }
    }
    if (fields.length === 0) {
      res.status(400).json({ error: { code: 'NO_FIELDS', message: 'No fields to update' } });
      return;
    }
    values.push(id);

    await pool.execute(`UPDATE announcements SET ${fields.join(', ')} WHERE id = ?`, values);

    await logAudit({
      adminId: req.admin!.adminId,
      action: 'edit_announcement',
      targetType: 'announcement',
      targetId: id,
      ip: req.ip,
    });

    res.json({ id, message: 'Announcement updated' });
  } catch (err) {
    console.error('[announcements/admin/update]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Admin: retry a send_failed announcement ---
// Atomically transitions send_failed -> sending, then re-dispatches via FCM.
// markSent() flips to 'sent' on success; handler writes 'send_failed' on throw.
router.post('/admin/:id/retry', requireAuth, sensitiveActionLimiter, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: { code: 'BAD_ID', message: 'Invalid id' } });
      return;
    }

    const [claimResult] = await pool.execute(
      `UPDATE announcements SET status = 'sending' WHERE id = ? AND status = 'send_failed'`,
      [id]
    );
    if ((claimResult as ResultSetHeader).affectedRows === 0) {
      // Either the id is wrong or the row isn't in send_failed. Don't surface DB state to the client;
      // check what happened and respond accordingly.
      const [existing] = await pool.execute('SELECT status FROM announcements WHERE id = ?', [id]);
      const rows = existing as RowDataPacket[];
      if (rows.length === 0) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Announcement not found' } });
        return;
      }
      res.status(409).json({
        error: {
          code: 'INVALID_STATE',
          message: `Announcement is in '${rows[0].status}' state; only send_failed can be retried`,
        },
      });
      return;
    }

    await logAudit({
      adminId: req.admin!.adminId,
      action: 'retry_announcement',
      targetType: 'announcement',
      targetId: id,
      ip: req.ip,
    });

    let finalStatus = 'sent';
    try {
      await sendAnnouncementToAll(id);
    } catch (fcmErr) {
      console.error('[announcements/retry] FCM send failed:', fcmErr);
      await pool.execute(
        `UPDATE announcements SET status = 'send_failed' WHERE id = ? AND status = 'sending'`,
        [id]
      );
      finalStatus = 'send_failed';
    }

    res.json({ id, status: finalStatus });
  } catch (err) {
    console.error('[announcements/retry]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Admin: delete announcement (any status, including sent) ---

router.delete('/admin/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);

    const [rows] = await pool.execute(
      'SELECT id, status, sent_at FROM announcements WHERE id = ?',
      [id]
    );
    const announcements = rows as RowDataPacket[];

    if (announcements.length === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Announcement not found' } });
      return;
    }

    await pool.execute('DELETE FROM announcements WHERE id = ?', [id]);

    await logAudit({
      adminId: req.admin!.adminId,
      action: 'delete_announcement',
      targetType: 'announcement',
      targetId: id,
      ip: req.ip,
    });

    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    console.error('[announcements/admin/delete]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
