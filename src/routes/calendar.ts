import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../services/audit';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

const router = Router();

// --- Schemas ---

const publicQuerySchema = z.object({
  // ISO-8601 with offset (e.g. 2026-04-24T10:00:00+03:00). Rejects malformed input early.
  since: z.string().datetime({ offset: true }).optional(),
});

const createEventSchema = z.object({
  title_ar: z.string().min(1).max(200),
  title_ru: z.string().max(200).optional(),
  title_en: z.string().max(200).optional(),
  description_ar: z.string().max(4000).optional(),
  description_ru: z.string().max(4000).optional(),
  description_en: z.string().max(4000).optional(),
  rrule: z.string().max(500).optional().nullable(),
  starts_at: z.string().datetime({ offset: true }).optional().nullable(),
  duration_minutes: z.number().int().min(0).max(24 * 60).default(60),
  reminder_minutes_before: z.number().int().min(0).max(7 * 24 * 60).default(30),
  active: z.number().int().min(0).max(1).default(1),
});

const updateEventSchema = createEventSchema.partial();

// --- Public: list calendar events ---

router.get('/', validate(publicQuerySchema, 'query'), async (req, res) => {
  try {
    const { since } = req.query as unknown as z.infer<typeof publicQuerySchema>;

    let sql = `SELECT id, title_ar, title_ru, title_en, description_ar, description_ru, description_en,
                      rrule, starts_at, duration_minutes, reminder_minutes_before, active, updated_at
               FROM calendar_events WHERE active = 1`;
    const params: string[] = [];

    if (since) {
      sql += ' AND updated_at >= ?';
      params.push(since);
    }

    sql += ' ORDER BY starts_at ASC';

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('[calendar/list]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Admin: list all calendar events (including inactive) ---

router.get('/admin', requireAuth, async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, title_ar, title_ru, title_en, description_ar, description_ru, description_en,
              rrule, starts_at, duration_minutes, reminder_minutes_before, active, updated_at
       FROM calendar_events ORDER BY active DESC, starts_at ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[calendar/admin/list]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Admin: fetch single calendar event by id (used by Edit form) ---

router.get('/admin/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: { code: 'BAD_ID', message: 'Invalid id' } });
      return;
    }
    const [rows] = await pool.execute(
      `SELECT id, title_ar, title_ru, title_en, description_ar, description_ru, description_en,
              rrule, starts_at, duration_minutes, reminder_minutes_before, active, updated_at
       FROM calendar_events WHERE id = ?`,
      [id]
    );
    const list = rows as RowDataPacket[];
    if (list.length === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Event not found' } });
      return;
    }
    res.json(list[0]);
  } catch (err) {
    console.error('[calendar/admin/get]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Admin: create event ---

router.post('/admin', requireAuth, validate(createEventSchema), async (req, res) => {
  try {
    const data = req.body as z.infer<typeof createEventSchema>;

    const [result] = await pool.execute(
      `INSERT INTO calendar_events
        (title_ar, title_ru, title_en, description_ar, description_ru, description_en, rrule, starts_at, duration_minutes, reminder_minutes_before, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title_ar,
        data.title_ru ?? null,
        data.title_en ?? null,
        data.description_ar ?? null,
        data.description_ru ?? null,
        data.description_en ?? null,
        data.rrule ?? null,
        data.starts_at ?? null,
        data.duration_minutes,
        data.reminder_minutes_before,
        data.active,
      ]
    );
    const insertId = (result as ResultSetHeader).insertId;

    await logAudit({
      adminId: req.admin!.adminId,
      action: 'create_calendar_event',
      targetType: 'calendar_event',
      targetId: insertId,
      ip: req.ip,
    });

    res.status(201).json({ id: insertId });
  } catch (err) {
    console.error('[calendar/admin/create]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Admin: update event ---

router.put('/admin/:id', requireAuth, validate(updateEventSchema), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const data = req.body as z.infer<typeof updateEventSchema>;

    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    const fields: Array<{ key: keyof typeof data; column: string }> = [
      { key: 'title_ar', column: 'title_ar' },
      { key: 'title_ru', column: 'title_ru' },
      { key: 'title_en', column: 'title_en' },
      { key: 'description_ar', column: 'description_ar' },
      { key: 'description_ru', column: 'description_ru' },
      { key: 'description_en', column: 'description_en' },
      { key: 'rrule', column: 'rrule' },
      { key: 'starts_at', column: 'starts_at' },
      { key: 'duration_minutes', column: 'duration_minutes' },
      { key: 'reminder_minutes_before', column: 'reminder_minutes_before' },
      { key: 'active', column: 'active' },
    ];

    for (const f of fields) {
      if (data[f.key] !== undefined) {
        setClauses.push(`${f.column} = ?`);
        values.push(data[f.key] ?? null);
      }
    }

    if (setClauses.length === 0) {
      res.status(400).json({ error: { code: 'NO_UPDATES', message: 'No fields to update' } });
      return;
    }

    values.push(id);
    await pool.execute(
      `UPDATE calendar_events SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    await logAudit({
      adminId: req.admin!.adminId,
      action: 'update_calendar_event',
      targetType: 'calendar_event',
      targetId: id,
      ip: req.ip,
    });

    res.json({ message: 'Event updated' });
  } catch (err) {
    console.error('[calendar/admin/update]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Admin: delete event ---

router.delete('/admin/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);

    const [existing] = await pool.execute('SELECT id FROM calendar_events WHERE id = ?', [id]);
    if ((existing as RowDataPacket[]).length === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Event not found' } });
      return;
    }

    await pool.execute('DELETE FROM calendar_events WHERE id = ?', [id]);

    await logAudit({
      adminId: req.admin!.adminId,
      action: 'delete_calendar_event',
      targetType: 'calendar_event',
      targetId: id,
      ip: req.ip,
    });

    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('[calendar/admin/delete]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
