import { Router, Request, Response } from 'express';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = Router();

// GET /api/audit-logs - Query immutable audit events with multi-criteria filtering & search
router.get('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const module = req.query.module as string;
    const action = req.query.action as string;
    const search = req.query.search as string;
    const userEmail = req.query.user_email as string;

    let query = 'SELECT * FROM audit_logs WHERE tenant_id = ?';
    const params: any[] = [req.tenantId];

    if (module && module !== 'ALL') {
      query += ' AND module = ?';
      params.push(module);
    }

    if (action && action !== 'ALL') {
      query += ' AND action = ?';
      params.push(action);
    }

    if (userEmail) {
      query += ' AND user_email LIKE ?';
      params.push(`%${userEmail}%`);
    }

    if (search && search.trim()) {
      query += ' AND (action LIKE ? OR module LIKE ? OR user_email LIKE ? OR ip_address LIKE ? OR record_id LIKE ? OR new_values LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s, s);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const logs = db.prepare(query).all(...params) as any[];

    // Parse JSON fields safely for convenient UI consumption
    const parsedLogs = logs.map(l => {
      let parsedOld = null;
      let parsedNew = null;
      try {
        if (l.old_values) parsedOld = JSON.parse(l.old_values);
      } catch (e) {
        parsedOld = l.old_values;
      }
      try {
        if (l.new_values) parsedNew = JSON.parse(l.new_values);
      } catch (e) {
        parsedNew = l.new_values;
      }
      return {
        ...l,
        old_values: parsedOld,
        new_values: parsedNew
      };
    });

    // Provide stats for administrative dashboard
    const totalCount = (db.prepare('SELECT count(*) as count FROM audit_logs WHERE tenant_id = ?').get(req.tenantId) as any)?.count || 0;
    const uniqueActors = (db.prepare('SELECT count(DISTINCT user_email) as count FROM audit_logs WHERE tenant_id = ?').get(req.tenantId) as any)?.count || 0;
    const moduleBreakdown = db.prepare('SELECT module, count(*) as count FROM audit_logs WHERE tenant_id = ? GROUP BY module ORDER BY count DESC').all(req.tenantId);

    res.json({
      success: true,
      count: parsedLogs.length,
      totalCount,
      uniqueActors,
      moduleBreakdown,
      data: parsedLogs
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
