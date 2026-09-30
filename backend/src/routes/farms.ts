import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { logAudit } from '../middleware/audit.js';
import { fetchFarmWeather } from '../services/weatherService.js';

const router = Router();

// GET /api/farms
router.get('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const search = req.query.search as string;
    let query = `
      SELECT f.*, fm.full_name as farmer_name, fm.phone as farmer_phone, fm.cooperative_name
      FROM farms f
      JOIN farmers fm ON fm.id = f.farmer_id
      WHERE f.tenant_id = ?
    `;
    const params: any[] = [req.tenantId];

    if (search) {
      query += ' AND (f.name LIKE ? OR f.location LIKE ? OR f.crop_types LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY f.created_at DESC';

    const farms = db.prepare(query).all(...params);
    res.json({ success: true, data: farms });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/farms/:id
router.get('/:id', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const farm = db.prepare(`
      SELECT f.*, fm.full_name as farmer_name, fm.phone as farmer_phone, fm.cooperative_name, fm.address as farmer_address
      FROM farms f
      JOIN farmers fm ON fm.id = f.farmer_id
      WHERE f.id = ? AND f.tenant_id = ?
    `).get(req.params.id, req.tenantId) as any;

    if (!farm) {
      res.status(404).json({ success: false, error: 'Farm not found' });
      return;
    }

    // Attach active crops
    const crops = db.prepare('SELECT * FROM crops WHERE farm_id = ? AND tenant_id = ?').all(farm.id, req.tenantId);

    // Attach live weather data for farm coordinates
    const weather = await fetchFarmWeather(farm.latitude, farm.longitude);

    res.json({ success: true, data: { ...farm, crops, weather } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/farms
router.post('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const {
      farmer_id, name, location, latitude, longitude,
      size_acres, crop_types, capacity_tons, irrigation_type,
      certification, contact_phone
    } = req.body;

    if (!farmer_id || !name || !latitude || !longitude) {
      res.status(400).json({ success: false, error: 'Farmer, name, and GPS coordinates are required' });
      return;
    }

    const farmId = `farm-${Date.now().toString().slice(-6)}`;
    db.prepare(`
      INSERT INTO farms (id, tenant_id, farmer_id, name, location, latitude, longitude, size_acres, crop_types, capacity_tons, irrigation_type, certification, contact_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      farmId, req.tenantId, farmer_id, name, location || 'California Valley',
      latitude, longitude, size_acres || 100, crop_types || 'Mixed Crops',
      capacity_tons || 250, irrigation_type || 'DRIP',
      certification || 'USDA_ORGANIC', contact_phone || null
    );

    logAudit({ req, action: 'CREATE_FARM', module: 'FARM', recordId: farmId, newValues: { name, latitude, longitude } });

    const newFarm = db.prepare('SELECT * FROM farms WHERE id = ?').get(farmId);
    res.status(201).json({ success: true, data: newFarm });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/farmers
router.get('/farmers/all', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const farmers = db.prepare('SELECT * FROM farmers WHERE tenant_id = ? ORDER BY full_name ASC').all(req.tenantId);
    res.json({ success: true, data: farmers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/farms/:id (Edit Farm)
router.put('/:id', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { name, location, latitude, longitude, size_acres, crop_types, capacity_tons, certification, contact_phone } = req.body;

    const existing = db.prepare('SELECT * FROM farms WHERE id = ? AND tenant_id = ?').get(id, req.tenantId) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Farm not found' });
      return;
    }

    db.prepare(`
      UPDATE farms SET name = ?, location = ?, latitude = ?, longitude = ?, size_acres = ?, crop_types = ?, capacity_tons = ?, certification = ?, contact_phone = ?
      WHERE id = ?
    `).run(
      name || existing.name,
      location || existing.location,
      latitude !== undefined ? latitude : existing.latitude,
      longitude !== undefined ? longitude : existing.longitude,
      size_acres !== undefined ? size_acres : existing.size_acres,
      crop_types || existing.crop_types,
      capacity_tons !== undefined ? capacity_tons : existing.capacity_tons,
      certification || existing.certification,
      contact_phone || existing.contact_phone,
      id
    );

    logAudit({ req, action: 'UPDATE_FARM', module: 'FARM', recordId: String(id), newValues: req.body });

    const updated = db.prepare('SELECT * FROM farms WHERE id = ?').get(id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/farms/:id (Delete Farm)
router.delete('/:id', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM farms WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Farm not found' });
      return;
    }

    db.prepare('DELETE FROM farms WHERE id = ?').run(id);
    logAudit({ req, action: 'DELETE_FARM', module: 'FARM', recordId: String(id) });

    res.json({ success: true, message: 'Farm deleted successfully', id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
