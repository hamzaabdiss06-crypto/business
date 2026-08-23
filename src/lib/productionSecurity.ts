import type { NextFunction, Request, Response } from 'express';

export type AuthenticatedUser = {
  uid: string;
  tenantId?: string;
  role?: string;
};

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

const STAFF_ROLES = new Set(['platform_admin', 'tenant_admin', 'manager', 'staff']);

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function requireTenantAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = req.user;
  const requestedTenant = req.params.tenantId;

  if (!user?.uid) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!requestedTenant) {
    res.status(400).json({ error: 'Tenant is required' });
    return;
  }

  if (user.role === 'platform_admin' || user.tenantId === requestedTenant) {
    next();
    return;
  }

  res.status(403).json({ error: 'Tenant access denied' });
}

export function requireStaffRole(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const role = req.user?.role;

  if (!req.user?.uid) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!role || !STAFF_ROLES.has(role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  next();
}

export function validateDemoMode(req: Request, res: Response, next: NextFunction): void {
  if (isProduction() && (req.path.startsWith('/api/demo') || req.headers['x-demo-role'])) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next();
}
