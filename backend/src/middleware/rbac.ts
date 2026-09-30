import { Request, Response, NextFunction } from 'express';
import { USER_ROLES, DEFAULT_PERMISSIONS, UserRole } from '../config/constants.js';

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role === USER_ROLES.SUPER_ADMIN) {
      next();
      return;
    }

    if (allowedRoles.includes(req.user.role)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: `Access denied. Role ${req.user.role} does not have required permissions for this action.`
    });
  };
}

export function checkPermission(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role === USER_ROLES.SUPER_ADMIN) {
      next();
      return;
    }

    const perms = DEFAULT_PERMISSIONS[req.user.role] || [];
    const hasPerm = perms.includes('*') || perms.includes(requiredPermission) || 
      perms.some(p => p.endsWith(':*') && requiredPermission.startsWith(p.slice(0, -1)));

    if (hasPerm) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: `Forbidden: Missing required permission [${requiredPermission}]`
    });
  };
}
