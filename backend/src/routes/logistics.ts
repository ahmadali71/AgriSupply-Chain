import { Router, Request, Response } from 'express';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { logAudit } from '../middleware/audit.js';
import { socketServer } from '../websocket/server.js';

const router = Router();

// GET /api/logistics/vehicles
router.get('/vehicles', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const vehicles = db.prepare(`
      SELECT v.*, d.full_name as driver_name, d.phone as driver_phone
      FROM vehicles v
      LEFT JOIN drivers d ON d.current_vehicle_id = v.id
      WHERE v.tenant_id = ?
      ORDER BY v.created_at DESC
    `).all(req.tenantId);
    res.json({ success: true, data: vehicles });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/logistics/vehicles
router.post('/vehicles', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { plate_number, model, capacity_kg, is_refrigerated = 1, min_temp_c = 1.0, max_temp_c = 8.0 } = req.body;
    if (!plate_number || !model || !capacity_kg) {
      res.status(400).json({ success: false, error: 'Plate number, model, and capacity are required' });
      return;
    }

    const vehId = `veh-${Date.now().toString().slice(-6)}`;
    db.prepare(`
      INSERT INTO vehicles (id, tenant_id, plate_number, model, capacity_kg, is_refrigerated, min_temp_c, max_temp_c, current_lat, current_lng, current_speed_kmh, current_temp_c, fuel_pct, battery_pct, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 37.8044, -122.2712, 0, 4.0, 100, 100, 'AVAILABLE')
    `).run(vehId, req.tenantId, plate_number, model, capacity_kg, is_refrigerated ? 1 : 0, min_temp_c, max_temp_c);

    // Also register default temperature sensor for this new vehicle
    const sensorId = `sns-${Date.now().toString().slice(-6)}`;
    db.prepare(`
      INSERT INTO sensors (id, sensor_code, tenant_id, sensor_type, attached_type, attached_id, min_threshold, max_threshold, current_value, battery_pct, status)
      VALUES (?, ?, ?, 'TEMPERATURE', 'VEHICLE', ?, ?, ?, 4.0, 100, 'ONLINE')
    `).run(sensorId, `SNS-${plate_number}`, req.tenantId, vehId, min_temp_c, max_temp_c);

    logAudit({ req, action: 'CREATE_VEHICLE', module: 'LOGISTICS', recordId: vehId, newValues: { plate_number, model } });

    const newVeh = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehId);
    res.status(201).json({ success: true, data: newVeh });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/logistics/drivers
router.get('/drivers', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const drivers = db.prepare(`
      SELECT d.*, v.plate_number as vehicle_plate, v.model as vehicle_model
      FROM drivers d
      LEFT JOIN vehicles v ON v.id = d.current_vehicle_id
      WHERE d.tenant_id = ?
      ORDER BY d.full_name ASC
    `).all(req.tenantId);
    res.json({ success: true, data: drivers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/logistics/shipments
router.get('/shipments', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const status = req.query.status as string;
    let query = `
      SELECT s.*, v.plate_number, v.model as vehicle_model, v.current_temp_c,
             d.full_name as driver_name, d.phone as driver_phone,
             b.batch_number, b.product_name, b.quantity_kg
      FROM shipments s
      JOIN vehicles v ON v.id = s.vehicle_id
      JOIN drivers d ON d.id = s.driver_id
      JOIN batches b ON b.id = s.batch_id
      WHERE s.tenant_id = ?
    `;
    const params: any[] = [req.tenantId];

    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }
    query += ' ORDER BY s.created_at DESC';

    const shipments = db.prepare(query).all(...params);
    res.json({ success: true, data: shipments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/logistics/shipments (Transport Manager creates shipment & assigns driver/vehicle)
router.post('/shipments', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const {
      batch_id, vehicle_id, driver_id, order_id,
      origin_type = 'FARM', origin_name, origin_lat, origin_lng,
      destination_type = 'WAREHOUSE', destination_name, destination_lat, destination_lng,
      estimated_arrival, required_min_temp_c = 2.0, required_max_temp_c = 8.0, distance_km = 45.0
    } = req.body;

    if (!batch_id || !vehicle_id || !driver_id || !origin_name || !destination_name) {
      res.status(400).json({ success: false, error: 'Batch, vehicle, driver, origin, and destination are required' });
      return;
    }

    const shipmentNumber = `SHP-${Date.now().toString().slice(-6)}`;
    const shipmentId = `shp-${Date.now().toString().slice(-6)}`;

    db.prepare(`
      INSERT INTO shipments (
        id, shipment_number, tenant_id, order_id, batch_id, vehicle_id, driver_id,
        origin_type, origin_name, origin_lat, origin_lng,
        destination_type, destination_name, destination_lat, destination_lng,
        departure_time, estimated_arrival, status, required_min_temp_c, required_max_temp_c,
        temperature_status, distance_km
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, 'IN_TRANSIT', ?, ?, 'NORMAL', ?)
    `).run(
      shipmentId, shipmentNumber, req.tenantId, order_id || null, batch_id, vehicle_id, driver_id,
      origin_type, origin_name, origin_lat || 36.6777, origin_lng || -121.6555,
      destination_type, destination_name, destination_lat || 37.8044, destination_lng || -122.2712,
      estimated_arrival || null, required_min_temp_c, required_max_temp_c, distance_km
    );

    // Update vehicle & driver status
    db.prepare("UPDATE vehicles SET status = 'IN_TRANSIT' WHERE id = ?").run(vehicle_id);
    db.prepare("UPDATE drivers SET status = 'ON_TRIP', current_vehicle_id = ? WHERE id = ?").run(vehicle_id, driver_id);

    // Update batch status to IN_TRANSIT
    db.prepare("UPDATE batches SET status = 'IN_TRANSIT', current_location = ?, updated_at = datetime('now') WHERE id = ?")
      .run(`In Transit (${vehicle_id})`, batch_id);

    // If linked to order, move order to IN_TRANSIT
    if (order_id) {
      db.prepare("UPDATE orders SET status = 'IN_TRANSIT', pipeline_stage = 'IN_TRANSIT', updated_at = datetime('now') WHERE id = ?")
        .run(order_id);
    }

    logAudit({ req, action: 'CREATE_SHIPMENT', module: 'LOGISTICS', recordId: shipmentId, newValues: { shipmentNumber, vehicle_id, driver_id } });

    socketServer.broadcast('orders', {
      event: 'SHIPMENT_DISPATCHED',
      shipmentId,
      shipmentNumber,
      driverId: driver_id,
      vehicleId: vehicle_id
    }, req.tenantId);

    const newShipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(shipmentId);
    res.status(201).json({ success: true, data: newShipment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/logistics/shipments/:id/status
router.put('/shipments/:id/status', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ success: false, error: 'Status is required' });
      return;
    }

    db.prepare("UPDATE shipments SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);

    logAudit({ req, action: 'UPDATE_SHIPMENT_STATUS', module: 'LOGISTICS', recordId: String(req.params.id), newValues: { status } });

    const updated = db.prepare('SELECT * FROM shipments WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/logistics/vehicles/:id (Edit Vehicle)
router.put('/vehicles/:id', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { plate_number, model, capacity_kg, min_temp_c, max_temp_c, status } = req.body;

    const existing = db.prepare('SELECT * FROM vehicles WHERE id = ? AND tenant_id = ?').get(id, req.tenantId) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Vehicle not found' });
      return;
    }

    db.prepare(`
      UPDATE vehicles SET plate_number = ?, model = ?, capacity_kg = ?, min_temp_c = ?, max_temp_c = ?, status = ?
      WHERE id = ?
    `).run(
      plate_number || existing.plate_number,
      model || existing.model,
      capacity_kg !== undefined ? capacity_kg : existing.capacity_kg,
      min_temp_c !== undefined ? min_temp_c : existing.min_temp_c,
      max_temp_c !== undefined ? max_temp_c : existing.max_temp_c,
      status || existing.status,
      id
    );

    logAudit({ req, action: 'UPDATE_VEHICLE', module: 'LOGISTICS', recordId: String(id), newValues: req.body });

    const updated = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/logistics/vehicles/:id (Delete Vehicle)
router.delete('/vehicles/:id', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM vehicles WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Vehicle not found' });
      return;
    }

    db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
    logAudit({ req, action: 'DELETE_VEHICLE', module: 'LOGISTICS', recordId: String(id) });

    res.json({ success: true, message: 'Vehicle deleted successfully', id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/logistics/shipments/:id (Delete / Cancel Shipment)
router.delete('/shipments/:id', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM shipments WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Shipment not found' });
      return;
    }

    db.prepare('DELETE FROM shipments WHERE id = ?').run(id);
    logAudit({ req, action: 'DELETE_SHIPMENT', module: 'LOGISTICS', recordId: String(id) });

    res.json({ success: true, message: 'Shipment cancelled and removed successfully', id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
