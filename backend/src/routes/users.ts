import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { logAudit } from '../middleware/audit.js';
import { parseAssignedTabs, ROLE_DEFAULT_TABS } from './auth.js';

const router = Router();

// GET /api/users - List users with online status, parsed assigned tabs, and document counts
router.get('/', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const roleFilter = req.query.role as string;
    let query = 'SELECT id, tenant_id, email, role, full_name, phone, status, last_login, assigned_tabs, created_at FROM users WHERE tenant_id = ?';
    const params: any[] = [req.tenantId];

    if (roleFilter) {
      query += ' AND role = ?';
      params.push(roleFilter);
    }
    query += ' ORDER BY created_at DESC';

    const rawUsers = db.prepare(query).all(...params) as any[];

    // Calculate online status (active within past 30 mins) and enrich with documents count
    const now = Date.now();
    const users = rawUsers.map(u => {
      let isOnline = false;
      if (u.last_login) {
        const lastLoginTime = new Date(u.last_login).getTime();
        // Online if logged in or active within 30 minutes
        if (!isNaN(lastLoginTime) && (now - lastLoginTime) < 30 * 60 * 1000) {
          isOnline = true;
        }
      }

      // Count attached duty files
      const docCount = (db.prepare("SELECT count(*) as count FROM documents WHERE related_type = 'USER_DUTY' AND related_id = ?").get(u.id) as any)?.count || 0;

      return {
        ...u,
        assigned_tabs: parseAssignedTabs(u),
        is_online: isOnline,
        documents_count: docCount
      };
    });

    res.json({ success: true, count: users.length, data: users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/users/:id - Get single user details
router.get('/:id', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const user = db.prepare('SELECT id, tenant_id, email, role, full_name, phone, status, last_login, assigned_tabs, created_at FROM users WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId) as any;
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const docs = db.prepare("SELECT id, file_name, file_size, mime_type, created_at, uploaded_by FROM documents WHERE related_type = 'USER_DUTY' AND related_id = ? ORDER BY created_at DESC").all(user.id);

    res.json({
      success: true,
      data: {
        ...user,
        assigned_tabs: parseAssignedTabs(user),
        documents: docs
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/users - Create new user with assigned tabs & role
router.post('/', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role, full_name, phone, assigned_tabs } = req.body;
    if (!email || !password || !role || !full_name) {
      res.status(400).json({ success: false, error: 'Email, password, role, and full_name are required' });
      return;
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const tabsToAssign = assigned_tabs && Array.isArray(assigned_tabs) ? assigned_tabs : (ROLE_DEFAULT_TABS[role] || ['dashboard']);

    db.prepare(`
      INSERT INTO users (id, tenant_id, email, password_hash, role, full_name, phone, status, assigned_tabs, last_login)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, datetime('now'))
    `).run(userId, req.tenantId, email, passwordHash, role, full_name, phone || null, JSON.stringify(tabsToAssign));

    logAudit({
      req,
      action: 'CREATE_USER',
      module: 'USER',
      recordId: userId,
      newValues: { email, role, full_name, assigned_tabs: tabsToAssign }
    });

    const newUser = db.prepare('SELECT id, tenant_id, email, role, full_name, phone, status, assigned_tabs, created_at FROM users WHERE id = ?').get(userId) as any;
    res.status(201).json({
      success: true,
      data: {
        ...newUser,
        assigned_tabs: parseAssignedTabs(newUser)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/users/:id - Admin updates user details, role, status, and custom tab duties
router.put('/:id', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const userId = req.params.id;
    const { full_name, email, phone, role, status, assigned_tabs } = req.body;

    const existing = db.prepare('SELECT * FROM users WHERE id = ? AND tenant_id = ?').get(userId, req.tenantId) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'User not found in tenant' });
      return;
    }

    const updatedFullName = full_name !== undefined ? full_name : existing.full_name;
    const updatedEmail = email !== undefined ? email : existing.email;
    const updatedPhone = phone !== undefined ? phone : existing.phone;
    const updatedRole = role !== undefined ? role : existing.role;
    const updatedStatus = status !== undefined ? status : existing.status;
    const updatedTabs = assigned_tabs !== undefined ? JSON.stringify(assigned_tabs) : existing.assigned_tabs;

    db.prepare(`
      UPDATE users 
      SET full_name = ?, email = ?, phone = ?, role = ?, status = ?, assigned_tabs = ?, updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).run(updatedFullName, updatedEmail, updatedPhone, updatedRole, updatedStatus, updatedTabs, userId, req.tenantId);

    const oldValues = {
      full_name: existing.full_name,
      email: existing.email,
      phone: existing.phone,
      role: existing.role,
      status: existing.status,
      assigned_tabs: existing.assigned_tabs
    };

    const newValues = {
      full_name: updatedFullName,
      email: updatedEmail,
      phone: updatedPhone,
      role: updatedRole,
      status: updatedStatus,
      assigned_tabs: assigned_tabs || existing.assigned_tabs
    };

    logAudit({
      req,
      action: 'UPDATE_USER_DETAILS',
      module: 'USER',
      recordId: String(userId),
      oldValues,
      newValues
    });

    const updatedUser = db.prepare('SELECT id, tenant_id, email, role, full_name, phone, status, last_login, assigned_tabs, updated_at FROM users WHERE id = ?').get(userId) as any;

    res.json({
      success: true,
      message: 'User details & duties successfully updated',
      data: {
        ...updatedUser,
        assigned_tabs: parseAssignedTabs(updatedUser)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/users/:id/documents - List attached duty files/SOPs
router.get('/:id/documents', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const docs = db.prepare(`
      SELECT id, file_name, file_size, mime_type, file_data_base64, uploaded_by, created_at 
      FROM documents 
      WHERE tenant_id = ? AND related_type = 'USER_DUTY' AND related_id = ? 
      ORDER BY created_at DESC
    `).all(req.tenantId, req.params.id);

    res.json({ success: true, data: docs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/users/:id/documents - Attach a duty SOP, certificate, or agreement file
router.post('/:id/documents', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const userId = req.params.id;
    const { file_name, file_size, mime_type, file_data_base64 } = req.body;

    if (!file_name || !file_data_base64) {
      res.status(400).json({ success: false, error: 'file_name and file_data_base64 are required' });
      return;
    }

    const docId = uuidv4();
    db.prepare(`
      INSERT INTO documents (id, tenant_id, title, category, related_type, related_id, file_name, file_size, mime_type, file_data_base64, uploaded_by)
      VALUES (?, ?, ?, 'DUTY_COMPLIANCE', 'USER_DUTY', ?, ?, ?, ?, ?, ?)
    `).run(
      docId,
      req.tenantId,
      file_name,
      userId,
      file_name,
      file_size || file_data_base64.length,
      mime_type || 'application/pdf',
      file_data_base64,
      req.user?.email || 'admin@agrisupply.io'
    );

    logAudit({
      req,
      action: 'ATTACH_DUTY_FILE',
      module: 'USER',
      recordId: String(userId),
      newValues: { docId, file_name }
    });

    res.status(201).json({
      success: true,
      message: 'Duty document attached successfully',
      data: {
        id: docId,
        file_name,
        file_size: file_size || file_data_base64.length,
        mime_type: mime_type || 'application/pdf',
        created_at: new Date().toISOString()
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/users/:id/documents/:docId - Remove a duty file
router.delete('/:id/documents/:docId', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const doc = db.prepare('SELECT file_name FROM documents WHERE id = ? AND related_id = ? AND tenant_id = ?').get(req.params.docId, req.params.id, req.tenantId) as any;
    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.docId);

    logAudit({
      req,
      action: 'REMOVE_DUTY_FILE',
      module: 'USER',
      recordId: String(req.params.id),
      oldValues: { docId: req.params.docId, file_name: doc.file_name }
    });

    res.json({ success: true, message: 'Document removed successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/users/:id - Suspend or delete user
router.delete('/:id', authenticate, enforceTenant, (req: Request, res: Response): void => {
  try {
    const user = db.prepare('SELECT email, role FROM users WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId) as any;
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    db.prepare("UPDATE users SET status = 'SUSPENDED' WHERE id = ?").run(req.params.id);

    logAudit({
      req,
      action: 'SUSPEND_USER',
      module: 'USER',
      recordId: String(req.params.id),
      newValues: { status: 'SUSPENDED' }
    });

    res.json({ success: true, message: 'User account suspended' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
