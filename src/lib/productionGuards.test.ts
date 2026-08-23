import { describe, expect, it } from 'vitest';
import {
  hasDriverIdentity,
  hasTenantAccess,
  isAllowedRole,
  isProductionEnvironment,
} from './productionGuards.js';

describe('production guards', () => {
  it('detects production without relying on a default', () => {
    expect(isProductionEnvironment({ NODE_ENV: 'production' })).toBe(true);
    expect(isProductionEnvironment({ NODE_ENV: 'development' })).toBe(false);
  });

  it('accepts only explicitly allowed roles', () => {
    expect(isAllowedRole('driver', ['driver'])).toBe(true);
    expect(isAllowedRole('unknown', ['driver'])).toBe(false);
    expect(isAllowedRole(undefined, ['driver'])).toBe(false);
  });

  it('isolates tenants unless the user is a platform admin', () => {
    expect(hasTenantAccess('tenant-a', 'tenant-a', 'staff')).toBe(true);
    expect(hasTenantAccess('tenant-a', 'tenant-b', 'staff')).toBe(false);
    expect(hasTenantAccess('tenant-a', 'tenant-b', 'platform_admin')).toBe(true);
  });

  it('prevents a driver from writing another driver identity', () => {
    expect(hasDriverIdentity('driver-a', 'driver-a', 'driver')).toBe(true);
    expect(hasDriverIdentity('driver-a', 'driver-b', 'driver')).toBe(false);
    expect(hasDriverIdentity('admin-a', 'driver-b', 'platform_admin')).toBe(true);
  });
});
