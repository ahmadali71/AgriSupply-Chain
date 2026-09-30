import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';

export interface AuditLogOptions {
  req: Request;
  action: string;
  module: string;
  recordId?: string;
  oldValues?: any;
  newValues?: any;
}

export function logAudit({ req, action, module, recordId, oldValues, newValues }: AuditLogOptions): void {
  try {
    let tenantId = req.tenantId || req.user?.tenant_id || req.body?.tenant_id;
    if (!tenantId || tenantId === 'system') {
      const defaultTenant: any = db.prepare('SELECT id FROM tenants LIMIT 1').get();
      tenantId = defaultTenant ? defaultTenant.id : 'tenant-greenvalley';
    }
    const userId = req.user?.id || null;
    const userEmail = req.user?.email || 'system@agrisupply.io';
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';
    const deviceInfo = req.headers['user-agent']?.slice(0, 150) || 'Unknown Client';

    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (id, tenant_id, user_id, user_email, action, module, record_id, old_values, new_values, ip_address, device_info, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    insertAudit.run(
      uuidv4(),
      tenantId,
      userId,
      userEmail,
      action,
      module,
      recordId || null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ipAddress,
      deviceInfo
    );
  } catch (err) {
    console.error('[AUDIT] Failed to write audit log:', err);
  }
}
