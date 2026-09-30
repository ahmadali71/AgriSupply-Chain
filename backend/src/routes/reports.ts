import { Router, Request, Response } from 'express';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = Router();

// Helper to convert objects to CSV string
function convertToCsv(data: any[]): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => 
    headers.map(header => {
      const val = obj[header] === null || obj[header] === undefined ? '' : String(obj[header]);
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// GET /api/reports/export
router.get('/export', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const type = req.query.type as string; // 'inventory', 'shipments', 'quality', 'temperature', 'finance'
    const format = req.query.format as string || 'csv'; // 'csv' or 'json'
    const t = req.tenantId;

    let data: any[] = [];
    let filename = `Report_${type}_${Date.now()}`;

    switch (type) {
      case 'inventory':
        data = db.prepare(`
          SELECT inv.product_name, b.batch_number, w.name as warehouse, sl.zone_name, sl.rack,
                 inv.available_qty_kg, inv.reserved_qty_kg, inv.unit, inv.expiry_date, inv.status
          FROM inventory inv
          JOIN warehouses w ON w.id = inv.warehouse_id
          JOIN storage_locations sl ON sl.id = inv.storage_location_id
          JOIN batches b ON b.id = inv.batch_id
          WHERE inv.tenant_id = ?
        `).all(t);
        filename = 'Inventory_Report';
        break;

      case 'shipments':
        data = db.prepare(`
          SELECT s.shipment_number, b.batch_number, b.product_name, v.plate_number, d.full_name as driver,
                 s.origin_name, s.destination_name, s.status, s.required_min_temp_c, s.required_max_temp_c,
                 s.temperature_status, s.distance_km, s.departure_time, s.actual_arrival
          FROM shipments s
          JOIN vehicles v ON v.id = s.vehicle_id
          JOIN drivers d ON d.id = s.driver_id
          JOIN batches b ON b.id = s.batch_id
          WHERE s.tenant_id = ?
        `).all(t);
        filename = 'Shipments_Logistics_Report';
        break;

      case 'quality':
        data = db.prepare(`
          SELECT qi.id, b.batch_number, b.product_name, u.full_name as inspector,
                 qi.visual_score, qi.measured_temp_c, qi.moisture_pct, qi.damage_pct,
                 qi.result, qi.inspection_date
          FROM quality_inspections qi
          JOIN batches b ON b.id = qi.batch_id
          JOIN users u ON u.id = qi.inspector_id
          WHERE qi.tenant_id = ?
        `).all(t);
        filename = 'Quality_Compliance_Report';
        break;

      case 'temperature':
        data = db.prepare(`
          SELECT ta.id, ta.severity, ta.alert_type, ta.message, ta.reading_value,
                 ta.threshold_value, ta.status, ta.timestamp, s.sensor_code
          FROM temperature_alerts ta
          LEFT JOIN sensors s ON s.id = ta.sensor_id
          WHERE ta.tenant_id = ?
        `).all(t);
        filename = 'Cold_Chain_Excursions_Report';
        break;

      case 'finance':
        data = db.prepare(`
          SELECT i.invoice_number, r.name as retailer, i.total_amount, i.tax_amount,
                 i.transport_charges, i.net_payable, i.status, i.issued_date, i.due_date
          FROM invoices i
          JOIN retailers r ON r.id = i.retailer_id
          WHERE i.tenant_id = ?
        `).all(t);
        filename = 'Financial_Accounts_Report';
        break;

      default:
        res.status(400).json({ success: false, error: 'Invalid report type requested' });
        return;
    }

    if (format === 'json') {
      res.json({ success: true, count: data.length, data });
      return;
    }

    const csvContent = convertToCsv(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
