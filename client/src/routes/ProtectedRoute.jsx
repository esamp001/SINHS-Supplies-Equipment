import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth.js';
import { PATHS } from './navConfig.js';

/**
 * Guards routes: redirects to login when signed out, and to the dashboard when the
 * user's role is not allowed to open the page.
 * @param {Object} props
 * @param {string[]} [props.roles] - Allowed role codes. Omit to allow any signed-in user.
 * @returns {JSX.Element}
 */
export const ProtectedRoute = ({ roles }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to={PATHS.LOGIN} replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.roleCode)) return <Navigate to={PATHS.DASHBOARD} replace />;
  return <Outlet />;
};
