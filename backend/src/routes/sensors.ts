import { Router, Request, Response } from 'express';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { logAudit } from '../middleware/audit.js';
import { iotSimulator } from '../services/iotSimulator.js';
import { socketServer } from '../websocket/server.js';

const router = Router();

// GET /api/sensors
router.get('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const sensors = db.prepare(`
      SELECT s.*, 
             CASE 
               WHEN s.attached_type = 'VEHICLE' THEN (SELECT plate_number FROM vehicles WHERE id = s.attached_id)
               WHEN s.attached_type = 'WAREHOUSE' THEN (SELECT name FROM warehouses WHERE id = s.attached_id)
               ELSE 'Unassigned'
             END as attached_name
      FROM sensors s
      WHERE s.tenant_id = ?
      ORDER BY s.status DESC, s.created_at DESC
    `).all(req.tenantId);

    res.json({ success: true, data: sensors });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/sensors/:id/readings
router.get('/:id/readings', authenticate, (req: Request, res: Response): void => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const readings = db.prepare(`
      SELECT * FROM sensor_readings
      WHERE sensor_id = ?
      ORDER BY timestamp DESC LIMIT ?
    `).all(req.params.id, limit);

    res.json({ success: true, data: readings.reverse() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/sensors/alerts
router.get('/alerts/all', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const status = req.query.status as string;
    let query = `
      SELECT ta.*, s.sensor_code, s.sensor_type,
             v.plate_number as vehicle_plate, w.name as warehouse_name
      FROM temperature_alerts ta
      LEFT JOIN sensors s ON s.id = ta.sensor_id
      LEFT JOIN shipments sh ON sh.id = ta.shipment_id
      LEFT JOIN vehicles v ON v.id = sh.vehicle_id
      LEFT JOIN warehouses w ON w.id = ta.warehouse_id
      WHERE ta.tenant_id = ?
    `;
    const params: any[] = [req.tenantId];

    if (status) {
      query += ' AND ta.status = ?';
      params.push(status);
    }
    query += ' ORDER BY ta.timestamp DESC LIMIT 100';

    const alerts = db.prepare(query).all(...params);
    res.json({ success: true, data: alerts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/sensors/alerts/:id/acknowledge
router.put('/alerts/:id/acknowledge', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    db.prepare(`
      UPDATE temperature_alerts 
      SET status = 'ACKNOWLEDGED', acknowledged_by = ? 
      WHERE id = ? AND tenant_id = ?
    `).run(req.user?.full_name || 'Inspector', req.params.id, req.tenantId);

    logAudit({ req, action: 'ACKNOWLEDGE_ALERT', module: 'COLD_CHAIN', recordId: String(req.params.id) });

    socketServer.broadcast('alerts', { event: 'ALERT_ACKNOWLEDGED', alertId: req.params.id }, req.tenantId);

    const updated = db.prepare('SELECT * FROM temperature_alerts WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/sensors/alerts/:id/resolve
router.put('/alerts/:id/resolve', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { resolution_notes } = req.body;
    db.prepare(`
      UPDATE temperature_alerts 
      SET status = 'RESOLVED', resolved_by = ?, resolution_notes = ?
      WHERE id = ? AND tenant_id = ?
    `).run(req.user?.full_name || 'Fleet Manager', resolution_notes || 'Temperature returned within nominal thresholds.', req.params.id, req.tenantId);

    logAudit({ req, action: 'RESOLVE_ALERT', module: 'COLD_CHAIN', recordId: String(req.params.id), newValues: { resolution_notes } });

    socketServer.broadcast('alerts', { event: 'ALERT_RESOLVED', alertId: req.params.id }, req.tenantId);

    const updated = db.prepare('SELECT * FROM temperature_alerts WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sensors/simulate-spike (Interactive Demonstration Trigger)
router.post('/simulate-spike', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { vehicle_plate = 'CA-9M104', temp_spike = 10.5 } = req.body;
    const result = iotSimulator.triggerManualExcursion(vehicle_plate, temp_spike);
    res.json({ success: true, message: 'Temperature spike simulation initiated', ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
