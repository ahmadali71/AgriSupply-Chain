import { Router, Request, Response } from 'express';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

// GET /api/warehouses
router.get('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const warehouses = db.prepare(`
      SELECT w.*, u.full_name as manager_name,
             (SELECT COUNT(*) FROM storage_locations WHERE warehouse_id = w.id) as location_count,
             (SELECT IFNULL(SUM(current_occupancy_kg), 0) FROM storage_locations WHERE warehouse_id = w.id) as total_occupied_kg,
             (SELECT IFNULL(SUM(capacity_kg), 0) FROM storage_locations WHERE warehouse_id = w.id) as total_storage_capacity_kg
      FROM warehouses w
      LEFT JOIN users u ON u.id = w.manager_id
      WHERE w.tenant_id = ?
      ORDER BY w.created_at DESC
    `).all(req.tenantId);
    res.json({ success: true, data: warehouses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/warehouses/:id
router.get('/:id', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const warehouse = db.prepare(`
      SELECT w.*, u.full_name as manager_name
      FROM warehouses w
      LEFT JOIN users u ON u.id = w.manager_id
      WHERE w.id = ? AND w.tenant_id = ?
    `).get(req.params.id, req.tenantId) as any;

    if (!warehouse) {
      res.status(404).json({ success: false, error: 'Warehouse not found' });
      return;
    }

    const locations = db.prepare('SELECT * FROM storage_locations WHERE warehouse_id = ?').all(warehouse.id);
    const activeSensors = db.prepare("SELECT * FROM sensors WHERE attached_id = ? AND attached_type = 'WAREHOUSE'").all(warehouse.id);
    const activeAlerts = db.prepare("SELECT * FROM temperature_alerts WHERE warehouse_id = ? AND status = 'OPEN'").all(warehouse.id);

    res.json({ success: true, data: { ...warehouse, locations, sensors: activeSensors, alerts: activeAlerts } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/warehouses
router.post('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { name, code, address, latitude, longitude, total_capacity_sqft, total_cold_rooms = 4, manager_id } = req.body;
    if (!name || !code || !address || !latitude || !longitude) {
      res.status(400).json({ success: false, error: 'Name, code, address, and coordinates are required' });
      return;
    }

    const whId = `wh-${Date.now().toString().slice(-6)}`;
    db.prepare(`
      INSERT INTO warehouses (id, tenant_id, name, code, address, latitude, longitude, total_capacity_sqft, total_cold_rooms, manager_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `).run(whId, req.tenantId, name, code, address, latitude, longitude, total_capacity_sqft || 50000, total_cold_rooms, manager_id || null);

    logAudit({ req, action: 'CREATE_WAREHOUSE', module: 'WAREHOUSE', recordId: whId, newValues: { name, code } });

    const newWh = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(whId);
    res.status(201).json({ success: true, data: newWh });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/warehouses/locations/all
router.get('/locations/all', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const locations = db.prepare(`
      SELECT sl.*, w.name as warehouse_name, w.code as warehouse_code
      FROM storage_locations sl
      JOIN warehouses w ON w.id = sl.warehouse_id
      WHERE sl.tenant_id = ?
      ORDER BY sl.zone_name ASC, sl.rack ASC
    `).all(req.tenantId);
    res.json({ success: true, data: locations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
