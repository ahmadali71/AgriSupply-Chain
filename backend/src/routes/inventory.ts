import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

// GET /api/inventory
router.get('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const warehouseId = req.query.warehouse_id as string;
    let query = `
      SELECT inv.*, w.name as warehouse_name, w.code as warehouse_code,
             sl.zone_name, sl.rack, sl.shelf, sl.target_temp_c,
             b.batch_number, b.quality_grade, b.min_temp_c, b.max_temp_c
      FROM inventory inv
      JOIN warehouses w ON w.id = inv.warehouse_id
      JOIN storage_locations sl ON sl.id = inv.storage_location_id
      JOIN batches b ON b.id = inv.batch_id
      WHERE inv.tenant_id = ?
    `;
    const params: any[] = [req.tenantId];

    if (warehouseId) {
      query += ' AND inv.warehouse_id = ?';
      params.push(warehouseId);
    }
    query += ' ORDER BY inv.expiry_date ASC'; // FEFO sorting default!

    const items = db.prepare(query).all(...params);
    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/inventory/receive (Warehouse Receiving of a Batch)
router.post('/receive', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { batch_id, warehouse_id, storage_location_id, quantity_kg, notes } = req.body;
    if (!batch_id || !warehouse_id || !storage_location_id || !quantity_kg) {
      res.status(400).json({ success: false, error: 'Batch, warehouse, storage location, and quantity are required' });
      return;
    }

    const batch = db.prepare('SELECT * FROM batches WHERE id = ? AND tenant_id = ?').get(batch_id, req.tenantId) as any;
    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' });
      return;
    }

    const inventoryId = `inv-${Date.now().toString().slice(-6)}`;
    const txId = uuidv4();

    // 1. Create or update inventory
    db.prepare(`
      INSERT INTO inventory (id, tenant_id, warehouse_id, storage_location_id, batch_id, product_name, available_qty_kg, reserved_qty_kg, damaged_qty_kg, unit, expiry_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, 'IN_STORAGE')
    `).run(inventoryId, req.tenantId, warehouse_id, storage_location_id, batch_id, batch.product_name, quantity_kg, batch.unit, batch.expiry_date);

    // 2. Update storage location current occupancy
    db.prepare('UPDATE storage_locations SET current_occupancy_kg = current_occupancy_kg + ? WHERE id = ?').run(quantity_kg, storage_location_id);

    // 3. Update batch status to IN_WAREHOUSE & location
    const warehouse = db.prepare('SELECT name FROM warehouses WHERE id = ?').get(warehouse_id) as any;
    db.prepare("UPDATE batches SET status = 'IN_WAREHOUSE', current_location = ?, updated_at = datetime('now') WHERE id = ?")
      .run(warehouse?.name || 'Warehouse Cold Room', batch_id);

    // 4. Record transaction log
    db.prepare(`
      INSERT INTO inventory_transactions (id, tenant_id, batch_id, warehouse_id, storage_location_id, transaction_type, quantity_kg, reason, user_id)
      VALUES (?, ?, ?, ?, ?, 'STOCK_IN', ?, ?, ?)
    `).run(txId, req.tenantId, batch_id, warehouse_id, storage_location_id, quantity_kg, notes || 'Batch received into cold storage', req.user?.id);

    logAudit({ req, action: 'WAREHOUSE_RECEIVE', module: 'INVENTORY', recordId: inventoryId, newValues: { batch_id, quantity_kg, warehouse_id } });

    res.status(201).json({ success: true, message: 'Batch received successfully into inventory', inventoryId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/inventory/transfer
router.post('/transfer', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { inventory_id, target_location_id, quantity_kg, reason } = req.body;
    if (!inventory_id || !target_location_id || !quantity_kg) {
      res.status(400).json({ success: false, error: 'Inventory ID, target location, and quantity are required' });
      return;
    }

    const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND tenant_id = ?').get(inventory_id, req.tenantId) as any;
    if (!item || item.available_qty_kg < quantity_kg) {
      res.status(400).json({ success: false, error: 'Insufficient available quantity for transfer' });
      return;
    }

    // Decrement from old location
    db.prepare('UPDATE storage_locations SET current_occupancy_kg = MAX(0, current_occupancy_kg - ?) WHERE id = ?').run(quantity_kg, item.storage_location_id);

    // Update inventory location
    db.prepare('UPDATE inventory SET storage_location_id = ? WHERE id = ?').run(target_location_id, inventory_id);

    // Increment target location
    db.prepare('UPDATE storage_locations SET current_occupancy_kg = current_occupancy_kg + ? WHERE id = ?').run(quantity_kg, target_location_id);

    // Log transaction
    db.prepare(`
      INSERT INTO inventory_transactions (id, tenant_id, batch_id, warehouse_id, storage_location_id, transaction_type, quantity_kg, reason, user_id)
      VALUES (?, ?, ?, ?, ?, 'TRANSFER', ?, ?, ?)
    `).run(uuidv4(), req.tenantId, item.batch_id, item.warehouse_id, target_location_id, quantity_kg, reason || 'Internal location relocation', req.user?.id);

    logAudit({ req, action: 'TRANSFER_INVENTORY', module: 'INVENTORY', recordId: inventory_id, newValues: { target_location_id, quantity_kg } });

    res.json({ success: true, message: 'Stock transferred successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/inventory/transactions
router.get('/transactions', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const txs = db.prepare(`
      SELECT it.*, b.batch_number, b.product_name, w.name as warehouse_name, u.full_name as user_name
      FROM inventory_transactions it
      JOIN batches b ON b.id = it.batch_id
      JOIN warehouses w ON w.id = it.warehouse_id
      LEFT JOIN users u ON u.id = it.user_id
      WHERE it.tenant_id = ?
      ORDER BY it.timestamp DESC LIMIT 100
    `).all(req.tenantId);
    res.json({ success: true, data: txs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
