import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

// GET /api/tenants
router.get('/', (req: Request, res: Response): void => {
  try {
    const tenants = db.prepare('SELECT * FROM tenants ORDER BY created_at ASC').all();
    res.json({ success: true, data: tenants });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tenants
router.post('/', authenticate, (req: Request, res: Response): void => {
  try {
    const { name, slug, plan = 'PROFESSIONAL', contact_email, contact_phone, settings } = req.body;
    if (!name || !slug || !contact_email) {
      res.status(400).json({ success: false, error: 'Name, slug, and contact email are required' });
      return;
    }

    const tenantId = `tenant-${slug.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    db.prepare(`
      INSERT INTO tenants (id, name, slug, plan, status, contact_email, contact_phone, settings_json)
      VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
    `).run(tenantId, name, slug, plan, contact_email, contact_phone || null, JSON.stringify(settings || {}));

    logAudit({ req, action: 'CREATE_TENANT', module: 'TENANT', recordId: tenantId, newValues: { name, slug, plan } });

    const newTenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
    res.status(201).json({ success: true, data: newTenant });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tenants/:id
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id);
    if (!tenant) {
      res.status(404).json({ success: false, error: 'Tenant not found' });
      return;
    }
    res.json({ success: true, data: tenant });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
