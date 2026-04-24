import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

// Centralized error handler. Routes that call next(err) — or async routes that
// throw (caught by express-async-errors) — land here. Gives us one place to
// log + shape the response + later hook Sentry.captureException.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const reqId = (req as Request & { id?: string }).id;
  const errObj = err instanceof Error ? err : new Error(String(err));

  logger.error({ err: errObj, reqId, method: req.method, url: req.originalUrl }, 'unhandled route error');

  if (res.headersSent) {
    // Response already partially flushed — nothing to do but end it.
    return;
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      requestId: reqId,
    },
  });
}

// 404 fallback for unmatched API routes. Placed AFTER all app.use('/api/...') routers.
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `No route matches ${req.method} ${req.originalUrl}`,
    },
  });
}
