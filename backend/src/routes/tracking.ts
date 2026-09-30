import { Router, Request, Response } from 'express';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

// GET /api/tracking/live
router.get('/live', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const liveFleets = db.prepare(`
      SELECT v.*, d.full_name as driver_name, d.phone as driver_phone,
             s.id as shipment_id, s.shipment_number, s.origin_name, s.destination_name,
             s.destination_lat, s.destination_lng, s.required_min_temp_c, s.required_max_temp_c,
             b.product_name, b.batch_number
      FROM vehicles v
      LEFT JOIN shipments s ON s.vehicle_id = v.id AND s.status = 'IN_TRANSIT'
      LEFT JOIN drivers d ON d.id = s.driver_id OR d.current_vehicle_id = v.id
      LEFT JOIN batches b ON b.id = s.batch_id
      WHERE v.tenant_id = ?
    `).all(req.tenantId);

    res.json({ success: true, data: liveFleets });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tracking/history/:vehicleId (Breadcrumb polyline)
router.get('/history/:vehicleId', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const history = db.prepare(`
      SELECT * FROM gps_locations
      WHERE vehicle_id = ? AND tenant_id = ?
      ORDER BY timestamp DESC LIMIT ?
    `).all(req.params.vehicleId, req.tenantId, limit);

    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tracking/geofences
router.get('/geofences', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const geofences = db.prepare('SELECT * FROM geofences WHERE tenant_id = ? ORDER BY created_at DESC').all(req.tenantId);
    res.json({ success: true, data: geofences });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tracking/geofences
router.post('/geofences', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { name, zone_type = 'WAREHOUSE', latitude, longitude, radius_meters = 500, coordinates_json } = req.body;
    if (!name || !latitude || !longitude) {
      res.status(400).json({ success: false, error: 'Name, latitude, and longitude are required' });
      return;
    }

    const fenceId = `geo-${Date.now().toString().slice(-6)}`;
    db.prepare(`
      INSERT INTO geofences (id, tenant_id, name, zone_type, latitude, longitude, radius_meters, coordinates_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(fenceId, req.tenantId, name, zone_type, latitude, longitude, radius_meters, coordinates_json || null);

    logAudit({ req, action: 'CREATE_GEOFENCE', module: 'GEOFENCE', recordId: fenceId, newValues: { name, radius_meters } });

    const newFence = db.prepare('SELECT * FROM geofences WHERE id = ?').get(fenceId);
    res.status(201).json({ success: true, data: newFence });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tracking/geofences/events
router.get('/geofences/events', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const events = db.prepare(`
      SELECT ge.*, g.name as geofence_name, g.zone_type, v.plate_number, v.model as vehicle_model
      FROM geofence_events ge
      JOIN geofences g ON g.id = ge.geofence_id
      JOIN vehicles v ON v.id = ge.vehicle_id
      WHERE ge.tenant_id = ?
      ORDER BY ge.timestamp DESC LIMIT 100
    `).all(req.tenantId);

    res.json({ success: true, data: events });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
