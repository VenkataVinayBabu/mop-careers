import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { Loading } from './ui';

export const HOME_FOR_ROLE = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/app',
};

/**
 * Route guard. Enforces, in order:
 *   1. a valid session
 *   2. the forced first-login password change
 *   3. role membership — a user who lands on another role's route is sent to
 *      their own home rather than shown a permission error
 */
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading label="Checking your session…" />;

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (user.must_change_password) return <Navigate to="/change-password" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={HOME_FOR_ROLE[user.role] || '/login'} replace />;
  }

  return children;
}
