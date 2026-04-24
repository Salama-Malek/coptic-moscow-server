import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { comparePassword, hashPassword, generateTempPassword } from '../lib/password';
import { signToken } from '../lib/jwt';
import { requireAuth, requireSuperAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginLimiter, sensitiveActionLimiter } from '../middleware/ratelimit';
import { logAudit } from '../services/audit';
import { RowDataPacket } from 'mysql2';

const router = Router();

// --- Schemas ---

// Password .max(128) prevents DoS via very long bcrypt inputs (bcrypt is O(n) on input).
const loginSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(1).max(128),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(128),
  new_password: z.string().min(8).max(128),
});

const createAdminSchema = z.object({
  display_name: z.string().min(1).max(150),
  email: z.string().email().max(160),
  role: z.enum(['super_admin', 'admin']).default('admin'),
});

const updateAdminSchema = z.object({
  active: z.number().int().min(0).max(1).optional(),
  role: z.enum(['super_admin', 'admin']).optional(),
});

// --- Login ---

router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const [rows] = await pool.execute(
      'SELECT id, display_name, email, password_hash, role, language, must_change_password, active FROM admins WHERE email = ?',
      [email]
    );
    const admins = rows as RowDataPacket[];

    if (admins.length === 0) {
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      return;
    }

    const admin = admins[0];

    if (!admin.active) {
      res.status(401).json({ error: { code: 'ACCOUNT_DISABLED', message: 'Account is disabled' } });
      return;
    }

    const valid = await comparePassword(password, admin.password_hash);
    if (!valid) {
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      return;
    }

    const token = signToken({ adminId: admin.id, role: admin.role });

    await logAudit({
      adminId: admin.id,
      action: 'login',
      ip: req.ip,
    });

    res.json({
      token,
      admin: {
        id: admin.id,
        display_name: admin.display_name,
        email: admin.email,
        role: admin.role,
        language: admin.language,
        must_change_password: !!admin.must_change_password,
      },
    });
  } catch (err) {
    console.error('[admin/login]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Get current admin ---

router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, display_name, email, role, language, must_change_password FROM admins WHERE id = ?',
      [req.admin!.adminId]
    );
    const admins = rows as RowDataPacket[];

    if (admins.length === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Admin not found' } });
      return;
    }

    const admin = admins[0];
    res.json({
      id: admin.id,
      display_name: admin.display_name,
      email: admin.email,
      role: admin.role,
      language: admin.language,
      must_change_password: !!admin.must_change_password,
    });
  } catch (err) {
    console.error('[admin/me]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Change password ---

router.post('/me/password', requireAuth, sensitiveActionLimiter, validate(changePasswordSchema), async (req, res) => {
  try {
    const { current_password, new_password } = req.body as z.infer<typeof changePasswordSchema>;
    const adminId = req.admin!.adminId;

    const [rows] = await pool.execute(
      'SELECT password_hash FROM admins WHERE id = ?',
      [adminId]
    );
    const admins = rows as RowDataPacket[];

    if (admins.length === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Admin not found' } });
      return;
    }

    const valid = await comparePassword(current_password, admins[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } });
      return;
    }

    const hash = await hashPassword(new_password);
    await pool.execute(
      'UPDATE admins SET password_hash = ?, must_change_password = 0 WHERE id = ?',
      [hash, adminId]
    );

    await logAudit({ adminId, action: 'change_password', ip: req.ip });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('[admin/me/password]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Team management (super_admin only) ---

router.get('/team', requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, display_name, email, role, language, active, must_change_password, created_at FROM admins ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('[admin/team]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.post('/team', requireAuth, requireSuperAdmin, validate(createAdminSchema), async (req, res) => {
  try {
    const { display_name, email, role } = req.body as z.infer<typeof createAdminSchema>;

    // Check duplicate email
    const [existing] = await pool.execute('SELECT id FROM admins WHERE email = ?', [email]);
    if ((existing as RowDataPacket[]).length > 0) {
      res.status(409).json({ error: { code: 'DUPLICATE_EMAIL', message: 'An admin with this email already exists' } });
      return;
    }

    const tempPassword = generateTempPassword();
    const hash = await hashPassword(tempPassword);

    const [result] = await pool.execute(
      `INSERT INTO admins (display_name, email, password_hash, role, must_change_password)
       VALUES (?, ?, ?, ?, 1)`,
      [display_name, email, hash, role]
    );
    const insertId = (result as RowDataPacket).insertId as number;

    await logAudit({
      adminId: req.admin!.adminId,
      action: 'add_admin',
      targetType: 'admin',
      targetId: insertId,
      ip: req.ip,
    });

    res.status(201).json({
      id: insertId,
      display_name,
      email,
      role,
      temp_password: tempPassword,
    });
  } catch (err) {
    console.error('[admin/team/create]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.put('/team/:id', requireAuth, requireSuperAdmin, validate(updateAdminSchema), async (req, res) => {
  try {
    const targetId = parseInt(String(req.params.id), 10);
    const updates = req.body as z.infer<typeof updateAdminSchema>;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: { code: 'NO_UPDATES', message: 'No fields to update' } });
      return;
    }

    const setClauses: string[] = [];
    const values: (string | number)[] = [];

    if (updates.active !== undefined) {
      setClauses.push('active = ?');
      values.push(updates.active);
    }
    if (updates.role !== undefined) {
      setClauses.push('role = ?');
      values.push(updates.role);
    }

    values.push(targetId);
    await pool.execute(
      `UPDATE admins SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    await logAudit({
      adminId: req.admin!.adminId,
      action: 'update_admin',
      targetType: 'admin',
      targetId,
      ip: req.ip,
    });

    res.json({ message: 'Admin updated' });
  } catch (err) {
    console.error('[admin/team/update]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.post('/team/:id/reset-password', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const targetId = parseInt(String(req.params.id), 10);
    const tempPassword = generateTempPassword();
    const hash = await hashPassword(tempPassword);

    await pool.execute(
      'UPDATE admins SET password_hash = ?, must_change_password = 1 WHERE id = ?',
      [hash, targetId]
    );

    await logAudit({
      adminId: req.admin!.adminId,
      action: 'reset_admin_password',
      targetType: 'admin',
      targetId,
      ip: req.ip,
    });

    res.json({ temp_password: tempPassword });
  } catch (err) {
    console.error('[admin/team/reset-password]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// --- Stats ---

router.get('/stats', requireAuth, async (_req, res) => {
  try {
    const [totalRows] = await pool.execute('SELECT COUNT(*) as count FROM device_tokens');
    const totalDevices = (totalRows as RowDataPacket[])[0].count;

    const [active7dRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM device_tokens WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );
    const active7d = (active7dRows as RowDataPacket[])[0].count;

    const [active30dRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM device_tokens WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
    const active30d = (active30dRows as RowDataPacket[])[0].count;

    const [byLangRows] = await pool.execute(
      'SELECT language, COUNT(*) as count FROM device_tokens GROUP BY language'
    );

    const [announcementRows] = await pool.execute(
      `SELECT a.id, a.title_ar, a.title_ru, a.title_en, a.category, a.priority, a.status, a.sent_at, a.created_at,
              sl.sent_count, sl.failed_count
       FROM announcements a
       LEFT JOIN send_log sl ON sl.announcement_id = a.id
       ORDER BY a.created_at DESC LIMIT 10`
    );

    res.json({
      total_devices: totalDevices,
      active_7d: active7d,
      active_30d: active30d,
      by_language: byLangRows,
      last_announcements: announcementRows,
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
