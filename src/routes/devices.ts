import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { validate } from '../middleware/validate';

const router = Router();

const registerSchema = z.object({
  fcm_token: z.string().min(1).max(512),
  platform: z.enum(['ios', 'android']),
  app_version: z.string().max(20).optional(),
  language: z.enum(['ar', 'ru', 'en']).default('ar'),
  preferences: z.object({
    services: z.boolean().default(true),
    announcements: z.boolean().default(true),
  }).default({ services: true, announcements: true }),
});

const heartbeatSchema = z.object({
  fcm_token: z.string().min(1).max(512),
});

const preferencesSchema = z.object({
  fcm_token: z.string().min(1).max(512),
  language: z.enum(['ar', 'ru', 'en']).optional(),
  preferences: z.object({
    services: z.boolean(),
    announcements: z.boolean(),
  }).optional(),
});

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { fcm_token, platform, app_version, language, preferences } = req.body as z.infer<typeof registerSchema>;

    const tokenPrefix = fcm_token.length > 12 ? fcm_token.slice(0, 12) + '…' : fcm_token;
    console.log(`[devices/register] platform=${platform} lang=${language} ver=${app_version ?? '?'} token=${tokenPrefix} prefs=${JSON.stringify(preferences)}`);

    const [result] = await pool.execute(
      `INSERT INTO device_tokens (fcm_token, platform, app_version, language, preferences)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         platform = VALUES(platform),
         app_version = VALUES(app_version),
         language = VALUES(language),
         preferences = VALUES(preferences),
         last_seen = CURRENT_TIMESTAMP`,
      [fcm_token, platform, app_version ?? null, language, JSON.stringify(preferences)]
    );
    // affectedRows: 1 = inserted, 2 = updated (ON DUPLICATE KEY UPDATE)
    const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
    console.log(`[devices/register] → ${affected === 1 ? 'INSERTED new device' : affected === 2 ? 'UPDATED existing device' : `unexpected affectedRows=${affected}`}`);

    res.status(201).json({ message: 'Device registered' });
  } catch (err) {
    console.error('[devices/register] ERROR', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.post('/heartbeat', validate(heartbeatSchema), async (req, res) => {
  try {
    const { fcm_token } = req.body as z.infer<typeof heartbeatSchema>;

    await pool.execute(
      'UPDATE device_tokens SET last_seen = CURRENT_TIMESTAMP WHERE fcm_token = ?',
      [fcm_token]
    );

    res.json({ message: 'ok' });
  } catch (err) {
    console.error('[devices/heartbeat]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.put('/preferences', validate(preferencesSchema), async (req, res) => {
  try {
    const { fcm_token, language, preferences } = req.body as z.infer<typeof preferencesSchema>;

    const setClauses: string[] = [];
    const values: (string | null)[] = [];

    if (language !== undefined) {
      setClauses.push('language = ?');
      values.push(language);
    }
    if (preferences !== undefined) {
      setClauses.push('preferences = ?');
      values.push(JSON.stringify(preferences));
    }

    if (setClauses.length === 0) {
      res.status(400).json({ error: { code: 'NO_UPDATES', message: 'No fields to update' } });
      return;
    }

    values.push(fcm_token);
    await pool.execute(
      `UPDATE device_tokens SET ${setClauses.join(', ')} WHERE fcm_token = ?`,
      values
    );

    res.json({ message: 'Preferences updated' });
  } catch (err) {
    console.error('[devices/preferences]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
