import { Router } from 'express';
import { pool } from '../db/pool';
import { isFirebaseInitialized } from '../services/fcm';
import { logger } from '../lib/logger';

const router = Router();

// Real health check — 200 only if DB is reachable and Firebase initialized.
// UptimeRobot (or any external prober) should treat non-200 as down.
router.get('/', async (_req, res) => {
  const checks: Record<string, { ok: boolean; note?: string; ms?: number }> = {};
  let overallOk = true;

  // DB probe with a tight timeout — if MySQL is pegged we want to know fast.
  const dbStart = Date.now();
  try {
    await Promise.race([
      pool.execute('SELECT 1 AS ok'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('db probe timeout')), 1500)),
    ]);
    checks.db = { ok: true, ms: Date.now() - dbStart };
  } catch (err) {
    overallOk = false;
    checks.db = { ok: false, ms: Date.now() - dbStart, note: (err as Error).message };
    logger.warn({ err }, '[health] db probe failed');
  }

  // Firebase init state — if false, FCM sends will no-op (see fcm.ts guard).
  // Not a hard failure; log as warn but don't 503 on it, so the app can still
  // serve reads during a Firebase outage.
  checks.firebase = { ok: isFirebaseInitialized() };

  const status = overallOk ? 200 : 503;
  res.status(status).json({
    status: overallOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
