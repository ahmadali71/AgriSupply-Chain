import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { logAudit } from '../middleware/audit.js';
import { generateInspectionPdf } from '../services/pdfReportService.js';
import { socketServer } from '../websocket/server.js';

const router = Router();

// GET /api/inspections
router.get('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const inspections = db.prepare(`
      SELECT qi.*, b.batch_number, b.product_name, b.quantity_kg, b.min_temp_c, b.max_temp_c,
             u.full_name as inspector_name, f.name as farm_name
      FROM quality_inspections qi
      JOIN batches b ON b.id = qi.batch_id
      JOIN users u ON u.id = qi.inspector_id
      JOIN farms f ON f.id = b.farm_id
      WHERE qi.tenant_id = ?
      ORDER BY qi.inspection_date DESC
    `).all(req.tenantId);
    res.json({ success: true, data: inspections });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/inspections (Dynamic Multi-Step Inspection Submission)
router.post('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const {
      batch_id, product_type = 'VEGETABLES', visual_score,
      weight_kg, size_mm, moisture_pct, measured_temp_c,
      packaging_integrity, contamination_detected = false,
      damage_pct = 0, conditional_notes, corrective_action,
      result, inspector_signature, inspector_notes,
      images = [], gps_lat, gps_lng
    } = req.body;

    if (!batch_id || visual_score === undefined || measured_temp_c === undefined || !result) {
      res.status(400).json({ success: false, error: 'Batch, visual score, temperature, and final decision result are required' });
      return;
    }

    const batch = db.prepare('SELECT * FROM batches WHERE id = ? AND tenant_id = ?').get(batch_id, req.tenantId) as any;
    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' });
      return;
    }

    // Conditional rule validation: If temp > permitted limit, corrective_action is mandatory!
    if (measured_temp_c > batch.max_temp_c && !corrective_action) {
      res.status(400).json({
        success: false,
        error: `Temperature violation: Measured ${measured_temp_c}°C exceeds batch maximum safe limit of ${batch.max_temp_c}°C. Corrective action plan is mandatory!`
      });
      return;
    }

    const inspectionId = `insp-${Date.now().toString().slice(-6)}`;
    const inspectorId = req.user?.id || 'usr-inspector';

    db.prepare(`
      INSERT INTO quality_inspections (
        id, tenant_id, batch_id, inspector_id, inspection_date, product_type,
        visual_score, weight_kg, size_mm, moisture_pct, measured_temp_c,
        packaging_integrity, contamination_detected, damage_pct, conditional_notes,
        corrective_action, result, inspector_signature, inspector_notes, images_json,
        gps_lat, gps_lng
      ) VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      inspectionId, req.tenantId, batch_id, inspectorId, product_type,
      visual_score, weight_kg || batch.quantity_kg, size_mm || 65, moisture_pct || 90,
      measured_temp_c, packaging_integrity || 'INTACT', contamination_detected ? 1 : 0,
      damage_pct, conditional_notes || null, corrective_action || null, result,
      inspector_signature || req.user?.full_name || 'Inspector Signature',
      inspector_notes || null, JSON.stringify(images), gps_lat || 0, gps_lng || 0
    );

    // Update batch status according to inspection decision
    let newBatchStatus = 'INSPECTION_PENDING';
    if (result === 'PASSED') newBatchStatus = 'APPROVED';
    else if (result === 'FAILED') newBatchStatus = 'REJECTED';
    else if (result === 'CONDITIONAL') newBatchStatus = 'INSPECTION_PENDING';

    db.prepare("UPDATE batches SET status = ?, updated_at = datetime('now') WHERE id = ?").run(newBatchStatus, batch_id);

    logAudit({ req, action: 'SUBMIT_INSPECTION', module: 'QUALITY', recordId: inspectionId, newValues: { result, measured_temp_c, batch_id } });

    socketServer.broadcast('orders', {
      event: 'INSPECTION_COMPLETED',
      batchId: batch.id,
      batchNumber: batch.batch_number,
      result,
      inspectorName: req.user?.full_name
    }, req.tenantId);

    const newInsp = db.prepare('SELECT * FROM quality_inspections WHERE id = ?').get(inspectionId);
    res.status(201).json({ success: true, data: newInsp, batchStatus: newBatchStatus });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/inspections/:id/pdf - Generate inspection PDF certificate
router.get('/:id/pdf', authenticate, (req: Request, res: Response): void => {
  try {
    const inspection = db.prepare(`
      SELECT qi.*, u.full_name as inspector_name
      FROM quality_inspections qi
      JOIN users u ON u.id = qi.inspector_id
      WHERE qi.id = ?
    `).get(req.params.id) as any;

    if (!inspection) {
      res.status(404).json({ success: false, error: 'Inspection not found' });
      return;
    }

    const batch = db.prepare(`
      SELECT b.*, f.name as farm_name
      FROM batches b
      JOIN farms f ON f.id = b.farm_id
      WHERE b.id = ?
    `).get(inspection.batch_id) as any;

    const pdfBuffer = generateInspectionPdf(inspection, batch);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Quality_Certificate_${batch.batch_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/inspections/:id (Delete Inspection)
router.delete('/:id', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM quality_inspections WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Inspection not found' });
      return;
    }

    db.prepare('DELETE FROM quality_inspections WHERE id = ?').run(id);
    logAudit({ req, action: 'DELETE_INSPECTION', module: 'INSPECTION', recordId: String(id) });

    res.json({ success: true, message: 'Inspection record deleted successfully', id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
