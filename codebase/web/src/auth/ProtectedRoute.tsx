import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { CHANGE_PASSWORD_PATH, mustChangePassword } from './accountPaths';
import { useAuth } from './AuthContext';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-center">
        <p className="muted">Loading session…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword(user) && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-center">
        <p className="muted">Loading session…</p>
      </div>
    );
  }

  if (user) {
    if (mustChangePassword(user)) {
      return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
    }
    return <Navigate to={user.landingPath} replace />;
  }

  return <Outlet />;
}
