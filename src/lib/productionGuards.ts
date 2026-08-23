export const PRODUCTION_ROLES = ['platform_admin', 'tenant_admin', 'manager', 'staff', 'driver'] as const;

export type ProductionRole = typeof PRODUCTION_ROLES[number];

export function isProductionEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'production';
}

export function isAllowedRole(role: unknown, allowed: readonly ProductionRole[]): boolean {
  return typeof role === 'string' && allowed.includes(role as ProductionRole);
}

export function hasTenantAccess(
  userTenantId: unknown,
  requestedTenantId: unknown,
  role: unknown,
): boolean {
  if (role === 'platform_admin') return true;
  return typeof userTenantId === 'string' &&
    typeof requestedTenantId === 'string' &&
    userTenantId.length > 0 &&
    userTenantId === requestedTenantId;
}

export function hasDriverIdentity(userUid: unknown, driverId: unknown, role: unknown): boolean {
  if (role === 'platform_admin') return true;
  return role === 'driver' &&
    typeof userUid === 'string' &&
    typeof driverId === 'string' &&
    userUid.length > 0 &&
    userUid === driverId;
}
