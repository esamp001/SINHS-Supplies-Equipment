import { Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from '../components/layout/AppLayout.jsx';
import { ChangePasswordPage } from '../pages/auth/ChangePasswordPage.jsx';
import { LoginPage } from '../pages/auth/LoginPage.jsx';
import { RegisterPage } from '../pages/auth/RegisterPage.jsx';
import { BorrowingPage } from '../pages/borrowing/BorrowingPage.jsx';
import { DashboardPage } from '../pages/dashboard/DashboardPage.jsx';
import { ItemsPage } from '../pages/items/ItemsPage.jsx';
import { ItemTypesPage } from '../pages/itemTypes/ItemTypesPage.jsx';
import { MasterDataPage } from '../pages/masterData/MasterDataPage.jsx';
import { ComingSoonPage } from '../pages/misc/ComingSoonPage.jsx';
import { NotFoundPage } from '../pages/misc/NotFoundPage.jsx';
import { RequestsPage } from '../pages/requests/RequestsPage.jsx';
import { AvailableItemsPage } from '../pages/staff/AvailableItemsPage.jsx';
import { MyBorrowedPage } from '../pages/staff/MyBorrowedPage.jsx';
import { MyRequestsPage } from '../pages/staff/MyRequestsPage.jsx';
import { StockTransactionsPage } from '../pages/stockTransactions/StockTransactionsPage.jsx';
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
      <Route path={PATHS.CHANGE_PASSWORD} element={<ChangePasswordPage />} />
      <Route element={<AppLayout />}>
        <Route path={PATHS.DASHBOARD} element={<DashboardPage />} />

        <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
          <Route path={PATHS.USERS} element={<UsersPage />} />
          <Route path={PATHS.MASTER_DATA} element={<MasterDataPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={[ROLES.ADMIN, ROLES.CUSTODIAN]} />}>
          <Route path={PATHS.ITEMS} element={<ItemsPage />} />
          <Route path={PATHS.STOCK_TRANSACTIONS} element={<StockTransactionsPage />} />
          <Route path={PATHS.ITEM_TYPES} element={<ItemTypesPage />} />
          <Route path={PATHS.REQUESTS} element={<RequestsPage />} />
          <Route path={PATHS.BORROWING} element={<BorrowingPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={[ROLES.STAFF]} />}>
          <Route path={PATHS.AVAILABLE_ITEMS} element={<AvailableItemsPage />} />
          <Route path={PATHS.MY_REQUESTS} element={<MyRequestsPage />} />
          <Route path={PATHS.MY_BORROWED} element={<MyBorrowedPage />} />
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
