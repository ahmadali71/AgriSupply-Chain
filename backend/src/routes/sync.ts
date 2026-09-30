import { Router, Request, Response } from 'express';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { processSyncQueue } from '../services/syncService.js';

const router = Router();

// POST /api/sync (Process queued offline actions from mobile or PWA)
router.post('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, error: 'Expected items array' });
      return;
    }

    const summary = processSyncQueue(items, req, req.tenantId!);
    res.json({
      success: true,
      message: `Processed ${summary.totalItems} offline items (${summary.synced} synced, ${summary.conflicts} conflicts/errors)`,
      ...summary
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/sync/history
router.get('/history', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const history = db.prepare(`
      SELECT * FROM sync_queue WHERE tenant_id = ? ORDER BY server_timestamp DESC LIMIT 100
    `).all(req.tenantId);
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
