import { Router, Request, Response } from 'express';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { logAudit } from '../middleware/audit.js';
import { generateInvoicePdf } from '../services/pdfReportService.js';

const router = Router();

// GET /api/finance/invoices
router.get('/invoices', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const invoices = db.prepare(`
      SELECT i.*, r.name as retailer_name, r.contact_person, o.order_number, o.product_name
      FROM invoices i
      JOIN retailers r ON r.id = i.retailer_id
      LEFT JOIN orders o ON o.id = i.order_id
      WHERE i.tenant_id = ?
      ORDER BY i.issued_date DESC
    `).all(req.tenantId);

    res.json({ success: true, data: invoices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/finance/invoices/:id/pdf
router.get('/invoices/:id/pdf', authenticate, (req: Request, res: Response): void => {
  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as any;
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    const retailer = db.prepare('SELECT * FROM retailers WHERE id = ?').get(invoice.retailer_id) as any;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(invoice.order_id) as any;
    const items = order ? [{ product_name: order.product_name, quantity_kg: order.requested_qty_kg, unit_price: order.unit_price }] : [];

    const pdfBuffer = generateInvoicePdf(invoice, retailer, items);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice_${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/finance/payments (Record Payment)
router.post('/payments', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const { invoice_id, amount, payment_method = 'BANK_TRANSFER', transaction_reference } = req.body;
    if (!invoice_id || !amount) {
      res.status(400).json({ success: false, error: 'Invoice and amount are required' });
      return;
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND tenant_id = ?').get(invoice_id, req.tenantId) as any;
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    const payId = `pay-${Date.now().toString().slice(-6)}`;
    const payNum = `PAY-${Date.now().toString().slice(-6)}`;

    db.prepare(`
      INSERT INTO payments (id, payment_number, tenant_id, invoice_id, amount, payment_method, transaction_reference, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED')
    `).run(payId, payNum, req.tenantId, invoice_id, amount, payment_method, transaction_reference || `TXN-${Date.now()}`);

    // Update invoice status to PAID
    db.prepare("UPDATE invoices SET status = 'PAID' WHERE id = ?").run(invoice_id);

    logAudit({ req, action: 'RECORD_PAYMENT', module: 'FINANCE', recordId: payId, newValues: { amount, invoice_id } });

    res.status(201).json({ success: true, message: 'Payment recorded successfully', paymentNumber: payNum });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/finance/expenses
router.get('/expenses', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const expenses = db.prepare(`
      SELECT e.*, v.plate_number as vehicle_plate, w.name as warehouse_name
      FROM expenses e
      LEFT JOIN vehicles v ON v.id = e.vehicle_id
      LEFT JOIN warehouses w ON w.id = e.warehouse_id
      WHERE e.tenant_id = ?
      ORDER BY e.incurred_date DESC
    `).all(req.tenantId);

    res.json({ success: true, data: expenses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/finance/summary
router.get('/summary', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const rev = db.prepare(`
      SELECT IFNULL(SUM(net_payable), 0) as total_billed,
             IFNULL(SUM(CASE WHEN status = 'PAID' THEN net_payable ELSE 0 END), 0) as total_collected,
             IFNULL(SUM(CASE WHEN status = 'UNPAID' THEN net_payable ELSE 0 END), 0) as total_outstanding
      FROM invoices WHERE tenant_id = ?
    `).get(req.tenantId) as any;

    const exp = db.prepare(`
      SELECT IFNULL(SUM(amount), 0) as total_expenses
      FROM expenses WHERE tenant_id = ?
    `).get(req.tenantId) as any;

    const netProfit = rev.total_collected - exp.total_expenses;

    res.json({
      success: true,
      data: {
        totalBilled: rev.total_billed,
        totalCollected: rev.total_collected,
        totalOutstanding: rev.total_outstanding,
        totalExpenses: exp.total_expenses,
        netProfit
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
