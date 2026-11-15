import { Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from '../components/layout/AppLayout.jsx';
import { LoginPage } from '../pages/auth/LoginPage.jsx';
import { RegisterPage } from '../pages/auth/RegisterPage.jsx';
import { DashboardPage } from '../pages/dashboard/DashboardPage.jsx';
import { ComingSoonPage } from '../pages/misc/ComingSoonPage.jsx';
import { NotFoundPage } from '../pages/misc/NotFoundPage.jsx';
import { UsersPage } from '../pages/users/UsersPage.jsx';
import { ROLES } from '../utils/constants.js';
import { GuestRoute } from './GuestRoute.jsx';
import { PATHS, PLACEHOLDER_PAGES } from './navConfig.js';
import { ProtectedRoute } from './ProtectedRoute.jsx';

/**
 * Application routes: public auth pages, then role-guarded pages inside the app layout.
 * @returns {JSX.Element}
 */
export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to={PATHS.DASHBOARD} replace />} />

    <Route element={<GuestRoute />}>
      <Route path={PATHS.LOGIN} element={<LoginPage />} />
      <Route path={PATHS.REGISTER} element={<RegisterPage />} />
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path={PATHS.DASHBOARD} element={<DashboardPage />} />

        <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
          <Route path={PATHS.USERS} element={<UsersPage />} />
        </Route>

        {PLACEHOLDER_PAGES.map((page) => (
          <Route key={page.path} element={<ProtectedRoute roles={page.roles} />}>
            <Route path={page.path} element={<ComingSoonPage title={page.title} />} />
          </Route>
        ))}
      </Route>
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
