import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth.js';
import { PATHS } from './navConfig.js';

/**
 * Wraps public pages (login, register): signed-in users are sent to the dashboard.
 * Renders nothing while the session is being restored.
 * @returns {JSX.Element | null}
 */
export const GuestRoute = () => {
  const { user, initializing } = useAuth();

  if (initializing) {
    return null;
  }

  if (user) {
    return <Navigate to={PATHS.DASHBOARD} replace />;
  }

  return <Outlet />;
};
