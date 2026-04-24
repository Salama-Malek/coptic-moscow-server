import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../services/audit';

const router = Router();

const updateSnippetSchema = z.object({
  value_ar: z.string().min(1).max(500),
  value_ru: z.string().max(500).optional(),
  value_en: z.string().max(500).optional(),
});

// --- List all snippets ---

router.get('/', requireAuth, async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT `key`, value_ar, value_ru, value_en, updated_at FROM snippets ORDER BY `key`'
    );
    res.json(rows);
  } catch (err) {
    console.error('[snippets/list]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Update a snippet ---

router.put('/:key', requireAuth, validate(updateSnippetSchema), async (req, res) => {
  try {
    const key = String(req.params.key);
    const { value_ar, value_ru, value_en } = req.body as z.infer<typeof updateSnippetSchema>;

    await pool.execute(
      'UPDATE snippets SET value_ar = ?, value_ru = ?, value_en = ? WHERE `key` = ?',
      [value_ar, value_ru ?? null, value_en ?? null, key]
    );

    await logAudit({
      adminId: req.admin!.adminId,
      action: 'update_snippet',
      targetType: 'snippet',
      ip: req.ip,
    });

    res.json({ message: 'Snippet updated' });
  } catch (err) {
    console.error('[snippets/update]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
