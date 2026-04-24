import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { runMigrations } from './db/migrate';
import { runSeeds } from './db/seed';
import adminRoutes from './routes/admin';
import deviceRoutes from './routes/devices';
import announcementRoutes from './routes/announcements';
import calendarRoutes from './routes/calendar';
import snippetRoutes from './routes/snippets';
import templateRoutes from './routes/templates';
import cronRoutes from './routes/cron';
import { initFirebase } from './services/fcm';

dotenv.config();

// --- Global crash diagnostics ---
// Unhandled promise rejections and uncaught exceptions silently kill Node processes.
// Log them with full stack traces so Hostinger Runtime Logs show WHY the process exited,
// instead of just a mysterious restart.
process.on('unhandledRejection', (reason, promise) => {
  console.error('[fatal] Unhandled promise rejection');
  console.error('  promise:', promise);
  console.error('  reason:', reason);
  if (reason instanceof Error && reason.stack) {
    console.error('  stack:', reason.stack);
  }
});

process.on('uncaughtException', (err) => {
  console.error('[fatal] Uncaught exception:', err);
  if (err.stack) console.error('  stack:', err.stack);
  // Give the log a moment to flush before exit
  setTimeout(() => process.exit(1), 200);
});

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// --- Middleware ---
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

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- API Routes ---
app.use('/api/devices', deviceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/snippets', snippetRoutes);
app.use('/api/admin/templates', templateRoutes);
app.use('/api/cron', cronRoutes);

// --- Serve admin panel (built Vite output) ---
const adminWebDist = path.join(__dirname, '..', 'admin-web', 'dist');
app.use('/admin', express.static(adminWebDist));
app.get('/admin/*', (_req, res) => {
  res.sendFile(path.join(adminWebDist, 'index.html'));
});

// --- Startup ---
async function start(): Promise<void> {
  // Initialize Firebase (non-blocking if not configured)
  initFirebase();

  // Run migrations and seeds before listening
  await runMigrations();
  await runSeeds();

  app.listen(PORT, () => {
    console.log(`[server] Coptic Moscow API running on port ${PORT}`);
    console.log(`[server] Admin panel: http://localhost:${PORT}/admin`);
    console.log(`[server] Health check: http://localhost:${PORT}/api/health`);
  });
}

start().catch(err => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});

export { app };
