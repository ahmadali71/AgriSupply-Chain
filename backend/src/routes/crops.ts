import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

// GET /api/crops
router.get('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const crops = db.prepare(`
      SELECT c.*, f.name as farm_name, f.location as farm_location
      FROM crops c
      JOIN farms f ON f.id = c.farm_id
      WHERE c.tenant_id = ?
      ORDER BY c.created_at DESC
    `).all(req.tenantId);
    res.json({ success: true, data: crops });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/crops
router.post('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const {
      farm_id, name, variety, season, planting_date,
      expected_harvest_date, estimated_qty_kg, quality_grade
    } = req.body;

    if (!farm_id || !name || !planting_date || !expected_harvest_date) {
      res.status(400).json({ success: false, error: 'Farm, name, and dates are required' });
      return;
    }

    const cropId = `crp-${Date.now().toString().slice(-6)}`;
    db.prepare(`
      INSERT INTO crops (id, tenant_id, farm_id, name, variety, season, planting_date, expected_harvest_date, estimated_qty_kg, actual_qty_kg, quality_grade, lifecycle_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'GROWING')
    `).run(
      cropId, req.tenantId, farm_id, name, variety || 'Standard', season || 'Current Season',
      planting_date, expected_harvest_date, estimated_qty_kg || 10000, quality_grade || 'GRADE_A'
    );

    logAudit({ req, action: 'CREATE_CROP', module: 'CROP', recordId: cropId, newValues: { name, variety } });

    const newCrop = db.prepare('SELECT * FROM crops WHERE id = ?').get(cropId);
    res.status(201).json({ success: true, data: newCrop });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/harvests
router.get('/harvests/all', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const harvests = db.prepare(`
      SELECT h.*, c.name as crop_name, c.variety, f.name as farm_name
      FROM harvests h
      JOIN crops c ON c.id = h.crop_id
      JOIN farms f ON f.id = h.farm_id
      WHERE h.tenant_id = ?
      ORDER BY h.harvest_date DESC
    `).all(req.tenantId);
    res.json({ success: true, data: harvests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/harvests
router.post('/harvests', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { crop_id, farm_id, harvest_date, yield_kg, grade, weather_condition, notes } = req.body;
    if (!crop_id || !farm_id || !harvest_date || !yield_kg) {
      res.status(400).json({ success: false, error: 'Crop, farm, date, and yield are required' });
      return;
    }

    const harvestId = `hrv-${Date.now().toString().slice(-6)}`;
    db.prepare(`
      INSERT INTO harvests (id, tenant_id, crop_id, farm_id, harvest_date, yield_kg, grade, weather_condition, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(harvestId, req.tenantId, crop_id, farm_id, harvest_date, yield_kg, grade || 'GRADE_A', weather_condition || 'Clear', notes || null);

    // Update crop actual yield & status
    db.prepare(`
      UPDATE crops SET actual_qty_kg = actual_qty_kg + ?, lifecycle_status = 'HARVESTED' WHERE id = ?
    `).run(yield_kg, crop_id);

    logAudit({ req, action: 'RECORD_HARVEST', module: 'HARVEST', recordId: harvestId, newValues: { yield_kg } });

    const newHarvest = db.prepare('SELECT * FROM harvests WHERE id = ?').get(harvestId);
    res.status(201).json({ success: true, data: newHarvest });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
