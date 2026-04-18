import { pool } from '../db/pool';

export async function logAudit(params: {
  adminId: number;
  action: string;
  targetType?: string;
  targetId?: number;
  ip?: string;
}): Promise<void> {
  await pool.execute(
    `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, ip)
     VALUES (?, ?, ?, ?, ?)`,
    [params.adminId, params.action, params.targetType ?? null, params.targetId ?? null, params.ip ?? null]
  );
}
