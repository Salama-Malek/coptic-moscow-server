import { Request, Response, NextFunction } from 'express';

export function requireCronSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    res.status(500).json({ error: { code: 'CONFIG_ERROR', message: 'CRON_SECRET not configured' } });
    return;
  }

  const provided = req.headers['x-cron-secret'];
  if (provided !== secret) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } });
    return;
  }

  next();
}
