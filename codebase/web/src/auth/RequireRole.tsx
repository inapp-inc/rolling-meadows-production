import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { can, type Capability } from './permissions';
import type { UserRole } from '../api/client';

type RequireRoleProps = {
  /** Roles allowed through. Omit to allow any signed-in role. */
  roles?: UserRole[];
  /** Additional capability the role must hold, e.g. `mergeDuplicates`. */
  capability?: Capability;
};

/**
 * Route guard matching the prototype's per-page boot redirects: auditors land on
 * reports, liaisons on their lookup, and anyone else without access goes home.
 */
export function RequireRole({ roles, capability }: RequireRoleProps) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  const roleAllowed = !roles || roles.includes(user.role);
  const capabilityAllowed = !capability || can(user.role, capability);
  if (roleAllowed && capabilityAllowed) return <Outlet />;

  return <Navigate to={fallbackPathForRole(user.role)} replace />;
}

export function fallbackPathForRole(role: UserRole): string {
  if (role === 'platform_admin') return '/platform/tenants';
  if (role === 'tenant_admin') return '/admin/users';
  if (role === 'organization_admin') return '/dashboard';
  if (role === 'auditor') return '/reports?tier=integrity';
  if (role === 'cross_program_liaison') return '/liaison';
  return '/dashboard';
}
