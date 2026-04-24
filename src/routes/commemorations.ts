import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth, requireSuperAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../services/audit';
import { logger } from '../lib/logger';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// G8 — commemorations (40-day + 1-year memorials).
//
// On create: inserts the commemoration row + auto-creates two scheduled
// announcements (status='scheduled'). The existing send-due cron picks
// them up on the right date.
//
// On delete: removes the commemoration; the two linked announcements are
// deleted too (cascade-ish via manual delete since the FK is ON DELETE SET NULL
// — we delete them explicitly to avoid orphan scheduled sends).
//
// Super-admin only. Abouna's workflow; not delegated.

const router = Router();

const createSchema = z.object({
  name_ar: z.string().min(1).max(200),
  name_ru: z.string().max(200).optional(),
  name_en: z.string().max(200).optional(),
  date_of_repose: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  notes: z.string().max(2000).optional(),
});

interface CommemorationRow extends RowDataPacket {
  id: number;
  name_ar: string;
  name_ru: string | null;
  name_en: string | null;
  date_of_repose: string;
  notes: string | null;
  announcement_40d_id: number | null;
  announcement_1y_id: number | null;
  created_by: number;
  created_at: string;
}

/** Builds a localized memorial-announcement title + body for a given offset. */
function memorialText(
  names: { name_ar: string; name_ru?: string | null; name_en?: string | null },
  marker: '40d' | '1y',
): { title_ar: string; title_ru: string; title_en: string; body_ar: string; body_ru: string; body_en: string } {
  const nAr = names.name_ar;
  const nRu = names.name_ru || names.name_ar;
  const nEn = names.name_en || names.name_ar;
  if (marker === '40d') {
    return {
      title_ar: `تذكار أربعين ${nAr}`,
      title_ru: `40-й день со дня упокоения ${nRu}`,
      title_en: `40-day commemoration of ${nEn}`,
      body_ar: `نصلّي لراحة نفس ${nAr}. أذكروه في صلواتكم.`,
      body_ru: `Помолимся об упокоении ${nRu}. Поминайте его в ваших молитвах.`,
      body_en: `Please remember ${nEn} in your prayers on the 40th day of his/her repose.`,
    };
  }
  return {
    title_ar: `تذكار سنوي ${nAr}`,
    title_ru: `Годовщина упокоения ${nRu}`,
    title_en: `1-year commemoration of ${nEn}`,
    body_ar: `مرّت سنة على رقاد ${nAr}. نسأل الله أن يُريح نفسه.`,
    body_ru: `Год со дня упокоения ${nRu}. Да упокоит Господь его душу.`,
    body_en: `One year since the repose of ${nEn}. May the Lord grant rest to his/her soul.`,
  };
}

// --- List ---

router.get('/', requireAuth, requireSuperAdmin, async (_req, res) => {
  const [rows] = await pool.execute<CommemorationRow[]>(
    `SELECT c.*, adm.display_name AS created_by_name
     FROM commemorations c
     LEFT JOIN admins adm ON adm.id = c.created_by
     ORDER BY c.date_of_repose DESC
     LIMIT 200`,
  );
  res.json(rows);
});

// --- Create (auto-generates 2 scheduled announcements) ---

router.post('/', requireAuth, requireSuperAdmin, validate(createSchema), async (req, res) => {
  const data = req.body as z.infer<typeof createSchema>;
  const adminId = req.admin!.adminId;

  // Compute +40d and +1y. Scheduled for 09:00 Moscow time so it lands as a
  // morning push rather than at midnight.
  const reposeDate = new Date(`${data.date_of_repose}T09:00:00+03:00`);
  const fortyDay = new Date(reposeDate);
  fortyDay.setDate(fortyDay.getDate() + 40);
  const oneYear = new Date(reposeDate);
  oneYear.setFullYear(oneYear.getFullYear() + 1);

  const fortyText = memorialText(data, '40d');
  const oneYearText = memorialText(data, '1y');

  const insertAnnouncement = async (
    texts: ReturnType<typeof memorialText>,
    scheduledFor: Date,
  ): Promise<number> => {
    // If the scheduled date is already in the past (common for a 40d that's
    // technically already happened, or a 1y for a long-ago repose), insert
    // as 'draft' so it doesn't auto-send. Abouna can choose to send manually.
    const isPast = scheduledFor.getTime() < Date.now();
    const status = isPast ? 'draft' : 'scheduled';
    const [result] = await pool.execute(
      `INSERT INTO announcements
        (title_ar, title_ru, title_en, body_ar, body_ru, body_en, priority, category, status, scheduled_for, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'normal', 'announcement', ?, ?, ?)`,
      [
        texts.title_ar,
        texts.title_ru,
        texts.title_en,
        texts.body_ar,
        texts.body_ru,
        texts.body_en,
        status,
        isPast ? null : scheduledFor.toISOString().slice(0, 19).replace('T', ' '),
        adminId,
      ],
    );
    return (result as ResultSetHeader).insertId;
  };

  const fortyId = await insertAnnouncement(fortyText, fortyDay);
  const oneYearId = await insertAnnouncement(oneYearText, oneYear);

  const [commResult] = await pool.execute(
    `INSERT INTO commemorations
       (name_ar, name_ru, name_en, date_of_repose, notes, announcement_40d_id, announcement_1y_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name_ar,
      data.name_ru ?? null,
      data.name_en ?? null,
      data.date_of_repose,
      data.notes ?? null,
      fortyId,
      oneYearId,
      adminId,
    ],
  );
  const insertId = (commResult as ResultSetHeader).insertId;

  await logAudit({
    adminId,
    action: 'create_commemoration',
    targetType: 'commemoration',
    targetId: insertId,
    ip: req.ip,
  });

  logger.info(
    { commemorationId: insertId, fortyId, oneYearId, adminId },
    '[commemorations] created with auto-scheduled memorials',
  );

  res.status(201).json({ id: insertId, announcement_40d_id: fortyId, announcement_1y_id: oneYearId });
});

// --- Delete (also cancels pending announcements) ---

router.delete('/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: { code: 'BAD_ID', message: 'Invalid id' } });
    return;
  }

  const [rows] = await pool.execute<CommemorationRow[]>(
    'SELECT announcement_40d_id, announcement_1y_id FROM commemorations WHERE id = ?',
    [id],
  );
  if (rows.length === 0) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Commemoration not found' } });
    return;
  }

  const { announcement_40d_id, announcement_1y_id } = rows[0];

  // Only cancel announcements that haven't fired yet (still scheduled or draft).
  // Once they've been sent, leave them in History.
  const cancelIfPending = async (annId: number | null): Promise<void> => {
    if (!annId) return;
    await pool.execute(
      `DELETE FROM announcements WHERE id = ? AND status IN ('scheduled', 'draft')`,
      [annId],
    );
  };

  await cancelIfPending(announcement_40d_id);
  await cancelIfPending(announcement_1y_id);
  await pool.execute('DELETE FROM commemorations WHERE id = ?', [id]);

  await logAudit({
    adminId: req.admin!.adminId,
    action: 'delete_commemoration',
    targetType: 'commemoration',
    targetId: id,
    ip: req.ip,
  });

  res.json({ message: 'Commemoration deleted' });
});

export default router;
