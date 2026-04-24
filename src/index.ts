// express-async-errors monkey-patches Express so async route handlers that
// throw (without a local try/catch) are forwarded to the error middleware
// instead of becoming unhandled promise rejections. Must be imported before
// express is used.
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { runMigrations } from './db/migrate';
import { runSeeds } from './db/seed';
import adminRoutes from './routes/admin';
import deviceRoutes from './routes/devices';
import announcementRoutes from './routes/announcements';
import calendarRoutes from './routes/calendar';
import snippetRoutes from './routes/snippets';
import templateRoutes from './routes/templates';
import cronRoutes from './routes/cron';
import healthRoutes from './routes/health';
import systemRoutes from './routes/system';
import voiceUploadsRoutes, { getUploadsDir } from './routes/voice-uploads';
import commemorationRoutes from './routes/commemorations';
import { initFirebase } from './services/fcm';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

dotenv.config();

// --- Global crash diagnostics ---
// Unhandled promise rejections and uncaught exceptions silently kill Node processes.
// Log them with full stack traces so Hostinger Runtime Logs show WHY the process exited,
// instead of just a mysterious restart.
process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, '[fatal] unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, '[fatal] uncaught exception');
  // Give the log a moment to flush before exit
  setTimeout(() => process.exit(1), 200);
});

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// --- Middleware ---
// Request logger with stable req.id propagated through pino context + error handler.
// Cron-secret and Authorization headers are redacted via logger config.
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const existing = req.headers['x-request-id'];
      const id = (typeof existing === 'string' && existing) || randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    // Don't log successful /api/health probes at info — too noisy once UptimeRobot is hitting it.
    autoLogging: {
      ignore: (req) => req.url === '/api/health',
    },
  })
);
app.use(express.json());

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : [];

// Open CORS for public device/calendar/announcement endpoints
app.use('/api/devices', cors({ origin: '*' }));
app.use('/api/calendar', cors({ origin: '*' }));
app.use('/api/announcements', cors({ origin: '*' }));

// Restricted CORS for admin endpoints
app.use('/api/admin', cors({ origin: corsOrigins }));
app.use('/api/cron', cors({ origin: false }));

// --- Health check (real probes: DB + Firebase) ---
app.use('/api/health', healthRoutes);

// --- API Routes ---
app.use('/api/devices', deviceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/snippets', snippetRoutes);
app.use('/api/admin/templates', templateRoutes);
app.use('/api/admin/system', systemRoutes);
app.use('/api/admin/announcements', voiceUploadsRoutes);
app.use('/api/admin/commemorations', commemorationRoutes);
app.use('/api/cron', cronRoutes);

// --- Public static: user-uploaded audio ---
// UPLOADS_DIR is configurable (set outside the repo root in prod). Files
// are served without auth because the URL ships in the FCM data payload.
const uploadsDir = getUploadsDir();
app.use('/uploads', express.static(uploadsDir, {
  // Audio files are immutable (UUID filenames) so aggressive caching is safe.
  maxAge: '30d',
  immutable: true,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  },
}));
logger.info({ uploadsDir }, '[server] static uploads dir');

// --- Serve admin panel (built Vite output) ---
const adminWebDist = path.join(__dirname, '..', 'admin-web', 'dist');
app.use('/admin', express.static(adminWebDist));
app.get('/admin/*', (_req, res) => {
  res.sendFile(path.join(adminWebDist, 'index.html'));
});

// --- 404 for unmatched /api routes + centralized error handler ---
// Order matters: notFoundHandler for unknown /api/*, then errorHandler for thrown errors.
app.use('/api/*', notFoundHandler);
app.use(errorHandler);

// --- Startup ---
async function start(): Promise<void> {
  // Initialize Firebase (non-blocking if not configured)
  initFirebase();

  // Run migrations and seeds before listening
  await runMigrations();
  await runSeeds();

  app.listen(PORT, () => {
    logger.info({ port: PORT }, '[server] Coptic Moscow API listening');
    logger.info({ url: `http://localhost:${PORT}/admin` }, '[server] admin panel ready');
    logger.info({ url: `http://localhost:${PORT}/api/health` }, '[server] health check ready');
  });
}

start().catch(err => {
  logger.fatal({ err }, '[server] failed to start');
  process.exit(1);
});

export { app };
