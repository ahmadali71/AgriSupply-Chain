import { Router, Request, Response } from 'express';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { logAudit } from '../middleware/audit.js';
import { socketServer } from '../websocket/server.js';
import { PIPELINE_STAGES } from '../config/constants.js';

const router = Router();

// GET /api/orders
router.get('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const stage = req.query.stage as string;
    let query = `
      SELECT o.*, r.name as retailer_name, r.contact_person, r.phone as retailer_phone,
             b.batch_number, b.quality_grade
      FROM orders o
      JOIN retailers r ON r.id = o.retailer_id
      LEFT JOIN batches b ON b.id = o.batch_id
      WHERE o.tenant_id = ?
    `;
    const params: any[] = [req.tenantId];

    if (stage) {
      query += ' AND o.pipeline_stage = ?';
      params.push(stage);
    }
    query += ' ORDER BY o.created_at DESC';

    const orders = db.prepare(query).all(...params);
    res.json({ success: true, data: orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/orders (Retailer / Sales Order Creation)
router.post('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const {
      retailer_id, product_name, batch_id, requested_qty_kg,
      unit_price, delivery_address, delivery_lat, delivery_lng,
      required_delivery_date, priority = 'MEDIUM'
    } = req.body;

    if (!retailer_id || !product_name || !requested_qty_kg || !unit_price || !required_delivery_date) {
      res.status(400).json({ success: false, error: 'Retailer, product, quantity, price, and required date are required' });
      return;
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    const orderId = `ord-${Date.now().toString().slice(-6)}`;
    const totalAmount = +(requested_qty_kg * unit_price).toFixed(2);

    db.prepare(`
      INSERT INTO orders (id, order_number, tenant_id, retailer_id, product_name, batch_id, requested_qty_kg, unit_price, total_amount, delivery_address, delivery_lat, delivery_lng, required_delivery_date, status, pipeline_stage, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', 'NEW', ?)
    `).run(
      orderId, orderNumber, req.tenantId, retailer_id, product_name, batch_id || null,
      requested_qty_kg, unit_price, totalAmount, delivery_address || 'Delivery Address',
      delivery_lat || 37.7749, delivery_lng || -122.4194, required_delivery_date, priority
    );

    logAudit({ req, action: 'CREATE_ORDER', module: 'ORDER', recordId: orderId, newValues: { orderNumber, totalAmount } });

    socketServer.broadcast('orders', {
      event: 'ORDER_CREATED',
      orderId,
      orderNumber,
      product: product_name,
      totalAmount
    }, req.tenantId);

    const newOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    res.status(201).json({ success: true, data: newOrder });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/orders/:id/kanban (Drag & Drop Pipeline Stage Update)
router.put('/:id/kanban', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { pipeline_stage, status } = req.body;
    if (!pipeline_stage || !PIPELINE_STAGES.includes(pipeline_stage)) {
      res.status(400).json({ success: false, error: `Invalid pipeline stage. Allowed: ${PIPELINE_STAGES.join(', ')}` });
      return;
    }

    const oldOrder = db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId) as any;
    if (!oldOrder) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const newStatus = status || (pipeline_stage === 'DELIVERED' ? 'DELIVERED' : (pipeline_stage === 'DISPATCHED' ? 'IN_TRANSIT' : 'PROCESSING'));

    db.prepare("UPDATE orders SET pipeline_stage = ?, status = ?, updated_at = datetime('now') WHERE id = ?")
      .run(pipeline_stage, newStatus, req.params.id);

    logAudit({
      req, action: 'KANBAN_MOVE', module: 'ORDER', recordId: String(req.params.id),
      oldValues: { stage: oldOrder.pipeline_stage },
      newValues: { stage: pipeline_stage, status: newStatus }
    });

    socketServer.broadcast('orders', {
      event: 'KANBAN_ORDER_MOVED',
      orderId: req.params.id,
      orderNumber: oldOrder.order_number,
      fromStage: oldOrder.pipeline_stage,
      toStage: pipeline_stage
    }, req.tenantId);

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orders/retailers/all
router.get('/retailers/all', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const retailers = db.prepare('SELECT * FROM retailers WHERE tenant_id = ? ORDER BY name ASC').all(req.tenantId);
    res.json({ success: true, data: retailers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/orders/:id (Edit Order)
router.put('/:id', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { requested_qty_kg, unit_price, total_amount, delivery_address, priority, status, pipeline_stage } = req.body;

    const existing = db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ?').get(id, req.tenantId) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const newQty = requested_qty_kg !== undefined ? requested_qty_kg : existing.requested_qty_kg;
    const newPrice = unit_price !== undefined ? unit_price : existing.unit_price;
    const newTotal = total_amount !== undefined ? total_amount : (newQty * newPrice);

    db.prepare(`
      UPDATE orders SET requested_qty_kg = ?, unit_price = ?, total_amount = ?, delivery_address = ?, priority = ?, status = ?, pipeline_stage = ?
      WHERE id = ?
    `).run(
      newQty,
      newPrice,
      newTotal,
      delivery_address || existing.delivery_address,
      priority || existing.priority,
      status || existing.status,
      pipeline_stage || existing.pipeline_stage,
      id
    );

    logAudit({ req, action: 'UPDATE_ORDER', module: 'ORDER', recordId: String(id), newValues: req.body });

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/orders/:id (Delete Order)
router.delete('/:id', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    logAudit({ req, action: 'DELETE_ORDER', module: 'ORDER', recordId: String(id) });

    res.json({ success: true, message: 'Order deleted successfully', id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
