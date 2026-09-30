import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { logAudit } from '../middleware/audit.js';
import { socketServer } from '../websocket/server.js';

const router = Router();

// GET /api/deliveries
router.get('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const deliveries = db.prepare(`
      SELECT d.*, s.shipment_number, s.origin_name, s.destination_name,
             o.order_number, o.product_name, r.name as retailer_name
      FROM deliveries d
      JOIN shipments s ON s.id = d.shipment_id
      JOIN orders o ON o.id = d.order_id
      JOIN retailers r ON r.id = o.retailer_id
      WHERE d.tenant_id = ?
      ORDER BY d.timestamp DESC
    `).all(req.tenantId);

    res.json({ success: true, data: deliveries });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/deliveries (Driver Submits Digital Proof of Delivery)
router.post('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const {
      shipment_id, receiver_name, receiver_signature_data,
      receiver_photo_url, gps_lat, gps_lng, delivered_qty_kg,
      damaged_qty_kg = 0, delivery_notes
    } = req.body;

    if (!shipment_id || !receiver_name || !receiver_signature_data || delivered_qty_kg === undefined) {
      res.status(400).json({ success: false, error: 'Shipment, receiver name, signature, and delivered quantity are required' });
      return;
    }

    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ? AND tenant_id = ?').get(shipment_id, req.tenantId) as any;
    if (!shipment) {
      res.status(404).json({ success: false, error: 'Shipment not found' });
      return;
    }

    const deliveryId = `del-${Date.now().toString().slice(-6)}`;
    const receiptNumber = `POD-${Date.now().toString().slice(-6)}`;

    // 1. Create delivery record
    db.prepare(`
      INSERT INTO deliveries (
        id, receipt_number, shipment_id, order_id, tenant_id,
        receiver_name, receiver_signature_data, receiver_photo_url,
        gps_lat, gps_lng, delivered_qty_kg, damaged_qty_kg,
        delivery_notes, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      deliveryId, receiptNumber, shipment_id, shipment.order_id || 'unassigned', req.tenantId,
      receiver_name, receiver_signature_data, receiver_photo_url || null,
      gps_lat || 37.7699, gps_lng || -122.4271, delivered_qty_kg, damaged_qty_kg,
      delivery_notes || 'All pallets inspected and accepted in good order.'
    );

    // 2. Update shipment to DELIVERED
    db.prepare("UPDATE shipments SET status = 'DELIVERED', actual_arrival = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .run(shipment_id);

    // Free up vehicle and driver
    db.prepare("UPDATE vehicles SET status = 'AVAILABLE' WHERE id = ?").run(shipment.vehicle_id);
    db.prepare("UPDATE drivers SET status = 'AVAILABLE' WHERE id = ?").run(shipment.driver_id);

    // 3. Update order if connected
    if (shipment.order_id) {
      db.prepare("UPDATE orders SET status = 'DELIVERED', pipeline_stage = 'DELIVERED', updated_at = datetime('now') WHERE id = ?")
        .run(shipment.order_id);

      // 4. Auto-generate commercial invoice if not existing
      const existingInv = db.prepare('SELECT id FROM invoices WHERE order_id = ?').get(shipment.order_id);
      if (!existingInv) {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(shipment.order_id) as any;
        if (order) {
          const invId = `inv-${Date.now().toString().slice(-6)}`;
          const invNum = `INV-${Date.now().toString().slice(-6)}`;
          const subtotal = order.total_amount;
          const tax = +(subtotal * 0.08).toFixed(2);
          const transCharge = +(shipment.distance_km * 4.5).toFixed(2);
          const net = +(subtotal + tax + transCharge).toFixed(2);

          db.prepare(`
            INSERT INTO invoices (id, invoice_number, tenant_id, order_id, retailer_id, total_amount, tax_amount, transport_charges, warehouse_charges, discount_amount, net_payable, status, due_date, issued_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 150, 0, ?, 'UNPAID', date('now', '+30 days'), date('now'))
          `).run(invId, invNum, req.tenantId, order.id, order.retailer_id, subtotal, tax, transCharge, net);
        }
      }
    }

    logAudit({ req, action: 'SUBMIT_POD', module: 'DELIVERY', recordId: deliveryId, newValues: { receiptNumber, delivered_qty_kg } });

    socketServer.broadcast('orders', {
      event: 'DELIVERY_COMPLETED',
      deliveryId,
      receiptNumber,
      shipmentId: shipment.id,
      receiverName: receiver_name
    }, req.tenantId);

    const newDelivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(deliveryId);
    res.status(201).json({ success: true, data: newDelivery, receiptNumber });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
