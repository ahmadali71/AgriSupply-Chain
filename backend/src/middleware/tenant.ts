import { Request, Response, NextFunction } from 'express';
import { USER_ROLES } from '../config/constants.js';

export function enforceTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required for tenant operations' });
    return;
  }

  // Super Admin can switch tenants via x-tenant-id header or query param
  if (req.user.role === USER_ROLES.SUPER_ADMIN) {
    const requestedTenant = (req.headers['x-tenant-id'] as string) || (req.query.tenant_id as string);
    req.tenantId = requestedTenant || req.user.tenant_id;
    next();
    return;
  }

  // All other users are strictly bound to their assigned tenant
  const requestedTenant = req.headers['x-tenant-id'] as string;
  if (requestedTenant && requestedTenant !== req.user.tenant_id) {
    res.status(403).json({ 
      success: false, 
      error: 'Cross-tenant access forbidden. You cannot access resources outside your organization.' 
    });
    return;
  }

  req.tenantId = req.user.tenant_id;
  next();
}
