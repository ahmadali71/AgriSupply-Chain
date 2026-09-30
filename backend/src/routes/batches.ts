import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { logAudit } from '../middleware/audit.js';
import { buildBatchTraceability } from '../services/traceService.js';
import { socketServer } from '../websocket/server.js';

const router = Router();

// GET /api/batches
router.get('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const status = req.query.status as string;
    let query = `
      SELECT b.*, f.name as farm_name, f.location as farm_location, c.name as crop_name, c.variety
      FROM batches b
      JOIN farms f ON f.id = b.farm_id
      JOIN crops c ON c.id = b.crop_id
      WHERE b.tenant_id = ?
    `;
    const params: any[] = [req.tenantId];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }
    query += ' ORDER BY b.created_at DESC';

    const batches = db.prepare(query).all(...params);
    res.json({ success: true, data: batches });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/batches
router.post('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const {
      crop_id, farm_id, harvest_id, product_name,
      quantity_kg, unit = 'KG', quality_grade = 'GRADE_A',
      harvest_date, expiry_date, storage_type = 'COLD_STORAGE',
      min_temp_c = 2.0, max_temp_c = 8.0, current_location = 'FARM_GATE'
    } = req.body;

    if (!crop_id || !farm_id || !harvest_id || !product_name || !quantity_kg || !expiry_date) {
      res.status(400).json({ success: false, error: 'Crop, farm, harvest, product, quantity, and expiry date required' });
      return;
    }

    const year = new Date().getFullYear();
    const prodSlug = product_name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD');
    const randomSeq = Math.floor(100000 + Math.random() * 900000);
    const batchNumber = `BATCH-${year}-${prodSlug}-${randomSeq}`;
    const batchId = `bat-${Date.now().toString().slice(-6)}`;

    const qrData = JSON.stringify({
      batchNumber,
      batchId,
      product: product_name,
      tenantId: req.tenantId,
      farmId: farm_id,
      harvestDate: harvest_date || new Date().toISOString().split('T')[0],
      expiryDate: expiry_date,
      minTemp: min_temp_c,
      maxTemp: max_temp_c
    });

    db.prepare(`
      INSERT INTO batches (id, batch_number, tenant_id, crop_id, farm_id, harvest_id, product_name, quantity_kg, available_kg, unit, quality_grade, harvest_date, expiry_date, storage_type, min_temp_c, max_temp_c, current_location, status, qr_code_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CREATED', ?)
    `).run(
      batchId, batchNumber, req.tenantId, crop_id, farm_id, harvest_id,
      product_name, quantity_kg, quantity_kg, unit, quality_grade,
      harvest_date || new Date().toISOString().split('T')[0], expiry_date,
      storage_type, min_temp_c, max_temp_c, current_location, qrData
    );

    logAudit({ req, action: 'CREATE_BATCH', module: 'BATCH', recordId: batchId, newValues: { batchNumber, product_name, quantity_kg } });

    socketServer.broadcast('orders', { event: 'BATCH_CREATED', batchId, batchNumber, product: product_name }, req.tenantId);

    const newBatch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId);
    res.status(201).json({ success: true, data: newBatch });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/batches/:id
router.get('/:id', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const batch = db.prepare(`
      SELECT b.*, f.name as farm_name, f.location as farm_location, c.name as crop_name, c.variety,
             fm.full_name as farmer_name, h.yield_kg
      FROM batches b
      JOIN farms f ON f.id = b.farm_id
      JOIN crops c ON c.id = b.crop_id
      JOIN farmers fm ON fm.id = f.farmer_id
      JOIN harvests h ON h.id = b.harvest_id
      WHERE b.id = ? AND b.tenant_id = ?
    `).get(req.params.id, req.tenantId);

    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' });
      return;
    }
    res.json({ success: true, data: batch });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/batches/:id/status
router.put('/:id/status', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { status, location } = req.body;
    if (!status) {
      res.status(400).json({ success: false, error: 'Status is required' });
      return;
    }

    const oldBatch = db.prepare('SELECT * FROM batches WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId) as any;
    if (!oldBatch) {
      res.status(404).json({ success: false, error: 'Batch not found' });
      return;
    }

    if (location) {
      db.prepare("UPDATE batches SET status = ?, current_location = ?, updated_at = datetime('now') WHERE id = ?").run(status, location, req.params.id);
    } else {
      db.prepare("UPDATE batches SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
    }

    logAudit({ req, action: 'UPDATE_BATCH_STATUS', module: 'BATCH', recordId: String(req.params.id), oldValues: { status: oldBatch.status }, newValues: { status, location } });

    const updated = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/batches/trace/:identifier - Traceability Endpoint (Public or Authenticated)
router.get('/trace/:identifier', (req: Request, res: Response): void => {
  try {
    const trace = buildBatchTraceability(String(req.params.identifier));
    if (!trace) {
      res.status(404).json({ success: false, error: 'Batch traceability record not found' });
      return;
    }
    res.json({ success: true, data: trace });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
