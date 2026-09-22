import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/** Platform administrators may only use /platform/* routes (tenants, locales & labels). */
export function RestrictPlatformAdminScope() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (user?.role === 'platform_admin' && !pathname.startsWith('/platform')) {
    return <Navigate to="/platform/tenants" replace />;
  }

  return <Outlet />;
}
