import { Router, Request } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import { requireAuth } from '../middleware/auth';
import { sensitiveActionLimiter } from '../middleware/ratelimit';
import { logger } from '../lib/logger';

// Voice-message uploads for announcements.
//
// Storage: files land in UPLOADS_DIR/announcements/{uuid}.{ext}. In prod,
// UPLOADS_DIR MUST be outside the git-deployed repo root or files will be
// wiped on every auto-deploy. Served as public static by index.ts — the
// URL is delivered to mobile via the FCM data payload, so it cannot require
// auth. File names are UUIDs to prevent enumeration.
//
// Returns { url, duration_ms } — client passes url into the announcement
// create payload; server stores both as columns on the announcement.

const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', '..', 'uploads');

const ANNOUNCEMENTS_DIR = path.join(UPLOADS_DIR, 'announcements');

export function getUploadsDir(): string {
  return UPLOADS_DIR;
}

// Ensure the dir exists at module load so uploads don't fail on first call.
// On first boot the dir may be empty — that's fine.
try {
  fs.mkdirSync(ANNOUNCEMENTS_DIR, { recursive: true });
} catch (err) {
  logger.error({ err, dir: ANNOUNCEMENTS_DIR }, '[voice-uploads] failed to ensure uploads dir');
}

// 2 MB cap covers ~120 s of 128 kbps AAC or ~240 s of 64 kbps. Way above
// the per-message limit we'll document in the UI.
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mpeg',
  'audio/mp3',
  'audio/webm',
  'audio/ogg',
  'audio/aac',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ANNOUNCEMENTS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.m4a';
    // Whitelist extensions to keep disk tidy; reject anything exotic.
    const safeExt = /^\.(m4a|mp3|mp4|webm|ogg|aac)$/.test(ext) ? ext : '.m4a';
    cb(null, `${uuid()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error(`Unsupported audio MIME type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.post(
  '/voice',
  requireAuth,
  sensitiveActionLimiter,
  upload.single('audio'),
  (req: Request, res) => {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      res.status(400).json({ error: { code: 'NO_FILE', message: 'No audio file uploaded' } });
      return;
    }

    // Duration comes from the client — we can't easily probe the file here
    // without ffprobe. Validate upper bound anyway so a misbehaving client
    // can't claim a 10-hour recording.
    const rawDuration = Number(req.body?.duration_ms ?? 0);
    const durationMs = Number.isFinite(rawDuration) && rawDuration > 0
      ? Math.min(Math.round(rawDuration), 5 * 60 * 1000) // cap at 5 min
      : null;

    // Return an absolute URL so the mobile app (which only knows API_BASE_URL
    // = /api) can use it directly without stripping or rewriting. Prefer an
    // explicit PUBLIC_BASE_URL env for production (the canonical origin); fall
    // back to inferring from the request's protocol + host in dev.
    const base =
      process.env.PUBLIC_BASE_URL?.replace(/\/+$/, '') ||
      `${req.protocol}://${req.get('host')}`;
    const publicUrl = `${base}/uploads/announcements/${file.filename}`;

    logger.info(
      { filename: file.filename, size: file.size, durationMs, adminId: req.admin?.adminId },
      '[voice-uploads] stored',
    );

    res.json({ url: publicUrl, duration_ms: durationMs, size_bytes: file.size });
  },
);

export default router;
