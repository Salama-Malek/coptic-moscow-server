import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../services/audit';
import { renderTemplate } from '../services/template-renderer';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

const router = Router();

// --- Schemas ---

const createTemplateSchema = z.object({
  name_ar: z.string().min(1).max(150),
  name_ru: z.string().max(150).optional(),
  name_en: z.string().max(150).optional(),
  category: z.enum(['liturgy', 'vespers', 'feast', 'fast', 'meeting', 'custom']),
  body_ar_template: z.string().min(1).max(4000),
  body_ru_template: z.string().max(4000).optional(),
  body_en_template: z.string().max(4000).optional(),
  placeholders: z.array(z.object({
    key: z.string().min(1).max(64),
    label_ar: z.string().max(150),
    label_ru: z.string().max(150).optional(),
    label_en: z.string().max(150).optional(),
    type: z.enum(['text', 'date', 'time', 'datetime', 'boolean', 'number']),
    default: z.union([z.string().max(500), z.number(), z.boolean()]).optional(),
    optional: z.boolean().optional(),
  })).max(50),
});

const updateTemplateSchema = createTemplateSchema.partial();

const renderSchema = z.object({
  values: z.record(z.union([z.string().max(2000), z.number(), z.boolean(), z.null()])),
  language: z.enum(['ar', 'ru', 'en']).optional(),
});

// --- List templates ---

router.get('/', requireAuth, async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name_ar, name_ru, name_en, category, placeholders, created_at, updated_at
       FROM announcement_templates ORDER BY category, name_ar`
    );
    res.json(rows);
  } catch (err) {
    console.error('[templates/list]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Get single template ---

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [rows] = await pool.execute(
      'SELECT * FROM announcement_templates WHERE id = ?',
      [id]
    );
    const templates = rows as RowDataPacket[];

    if (templates.length === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Template not found' } });
      return;
    }

    res.json(templates[0]);
  } catch (err) {
    console.error('[templates/get]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Create template ---

router.post('/', requireAuth, validate(createTemplateSchema), async (req, res) => {
  try {
    const data = req.body as z.infer<typeof createTemplateSchema>;

    const [result] = await pool.execute(
      `INSERT INTO announcement_templates
        (name_ar, name_ru, name_en, category, body_ar_template, body_ru_template, body_en_template, placeholders, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name_ar,
        data.name_ru ?? null,
        data.name_en ?? null,
        data.category,
        data.body_ar_template,
        data.body_ru_template ?? null,
        data.body_en_template ?? null,
        JSON.stringify(data.placeholders),
        req.admin!.adminId,
      ]
    );
    const insertId = (result as ResultSetHeader).insertId;

    await logAudit({
      adminId: req.admin!.adminId,
      action: 'create_template',
      targetType: 'template',
      targetId: insertId,
      ip: req.ip,
    });

    res.status(201).json({ id: insertId });
  } catch (err) {
    console.error('[templates/create]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Update template ---

router.put('/:id', requireAuth, validate(updateTemplateSchema), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const data = req.body as z.infer<typeof updateTemplateSchema>;

    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    const fields: Array<{ key: keyof typeof data; column: string }> = [
      { key: 'name_ar', column: 'name_ar' },
      { key: 'name_ru', column: 'name_ru' },
      { key: 'name_en', column: 'name_en' },
      { key: 'category', column: 'category' },
      { key: 'body_ar_template', column: 'body_ar_template' },
      { key: 'body_ru_template', column: 'body_ru_template' },
      { key: 'body_en_template', column: 'body_en_template' },
    ];

    for (const f of fields) {
      if (data[f.key] !== undefined) {
        setClauses.push(`${f.column} = ?`);
        values.push((data[f.key] as string | null) ?? null);
      }
    }

    if (data.placeholders !== undefined) {
      setClauses.push('placeholders = ?');
      values.push(JSON.stringify(data.placeholders));
    }

    if (setClauses.length === 0) {
      res.status(400).json({ error: { code: 'NO_UPDATES', message: 'No fields to update' } });
      return;
    }

    values.push(id);
    await pool.execute(
      `UPDATE announcement_templates SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    await logAudit({
      adminId: req.admin!.adminId,
      action: 'update_template',
      targetType: 'template',
      targetId: id,
      ip: req.ip,
    });

    res.json({ message: 'Template updated' });
  } catch (err) {
    console.error('[templates/update]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Delete template ---

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);

    const [existing] = await pool.execute('SELECT id FROM announcement_templates WHERE id = ?', [id]);
    if ((existing as RowDataPacket[]).length === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Template not found' } });
      return;
    }

    await pool.execute('DELETE FROM announcement_templates WHERE id = ?', [id]);

    await logAudit({
      adminId: req.admin!.adminId,
      action: 'delete_template',
      targetType: 'template',
      targetId: id,
      ip: req.ip,
    });

    res.json({ message: 'Template deleted' });
  } catch (err) {
    console.error('[templates/delete]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Render template preview ---

router.post('/:id/render', requireAuth, validate(renderSchema), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { values, language } = req.body as z.infer<typeof renderSchema>;

    const [rows] = await pool.execute(
      'SELECT body_ar_template, body_ru_template, body_en_template FROM announcement_templates WHERE id = ?',
      [id]
    );
    const templates = rows as RowDataPacket[];

    if (templates.length === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Template not found' } });
      return;
    }

    const tmpl = templates[0];
    const castValues = values as Record<string, string | number | boolean | null | undefined>;

    const [body_ar, body_ru, body_en] = await Promise.all([
      renderTemplate(tmpl.body_ar_template, castValues, language ?? 'ar'),
      tmpl.body_ru_template
        ? renderTemplate(tmpl.body_ru_template, castValues, 'ru')
        : Promise.resolve(null),
      tmpl.body_en_template
        ? renderTemplate(tmpl.body_en_template, castValues, 'en')
        : Promise.resolve(null),
    ]);

    res.json({ body_ar, body_ru, body_en });
  } catch (err) {
    console.error('[templates/render]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
