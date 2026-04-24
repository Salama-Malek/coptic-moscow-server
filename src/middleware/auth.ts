import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/jwt';
import { pool } from '../db/pool';
import { logger } from '../lib/logger';
import { RowDataPacket } from 'mysql2';

declare global {
  namespace Express {
    interface Request {
      admin?: JwtPayload;
    }
  }
}

// H1 — active-admin check. JWTs are stateless and last 7 days; without this
// check a disabled admin retains access until token expiry. One indexed
// lookup per authed request; admin traffic is <1 QPS so cost is negligible.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } });
    return;
  }

  let payload: JwtPayload;
  try {
    const token = header.slice(7);
    payload = verifyToken(token);
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    return;
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT active FROM admins WHERE id = ?',
      [payload.adminId],
    );
    if (rows.length === 0 || rows[0].active !== 1) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Account disabled or deleted' } });
      return;
    }
    req.admin = payload;
    next();
  } catch (err) {
    // If the DB check fails, fail closed — safer to reject than to let a
    // potentially-disabled admin through.
    logger.error({ err, adminId: payload.adminId }, '[auth] active-check query failed');
    res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Authentication check failed' } });
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.admin || req.admin.role !== 'super_admin') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Super admin access required' } });
    return;
  }
  next();
}
