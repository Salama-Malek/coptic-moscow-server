import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50 : 5,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Try again in 15 minutes.' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
});

// For authenticated sensitive actions (password change, send announcement).
// Keyed by admin id when available, falling back to IP.
export const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 200 : 30,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please wait a few minutes.' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const adminId = (req as { admin?: { adminId?: number } }).admin?.adminId;
    return adminId ? `admin:${adminId}` : req.ip || 'unknown';
  },
});
