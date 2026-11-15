import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth.js';
import { PATHS } from './navConfig.js';

/**
 * Wraps public pages (login, register): signed-in users are sent to the dashboard.
 * @returns {JSX.Element}
 */
export const GuestRoute = () => {
  const { user } = useAuth();
  if (user) return <Navigate to={PATHS.DASHBOARD} replace />;
  return <Outlet />;
};
