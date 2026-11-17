import { Flex, Spin } from 'antd';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth.js';
import { PATHS } from './navConfig.js';

/**
 * Guards routes:
 * - waits while the session is restored from the cookie,
 * - sends signed-out users to login,
 * - sends users who must change their password to the change-password page,
 * - sends users without the required role back to the dashboard.
 * The server enforces every rule too.
 * @param {Object} props
 * @param {string[]} [props.roles] - Allowed role codes. Omit to allow any signed-in user.
 * @returns {JSX.Element}
 */
export const ProtectedRoute = ({ roles }) => {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: '100vh' }}>
        <Spin size="large" />
      </Flex>
    );
  }

  if (!user) {
    return <Navigate to={PATHS.LOGIN} replace state={{ from: location.pathname }} />;
  }

  if (user.mustChangePassword && location.pathname !== PATHS.CHANGE_PASSWORD) {
    return <Navigate to={PATHS.CHANGE_PASSWORD} replace />;
  }

  if (roles && !roles.includes(user.roleCode)) {
    return <Navigate to={PATHS.DASHBOARD} replace />;
  }

  return <Outlet />;
};
