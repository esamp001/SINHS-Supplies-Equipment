import * as dashboardRepository from '../repositories/dashboard.repository.js';
import { createAppError } from '../utils/errors.js';
import {
  DASHBOARD_LIST_LIMIT,
  DUE_SOON_DAYS,
  REQUEST_STATUS,
  ROLES,
  USER_STATUS,
} from '../utils/constants.js';

/**
 * @typedef {Object} DashboardSummary
 * @property {Object<string, number>} stats - Numbers for the stat cards, keyed by stat name.
 * @property {Object<string, Array<Object>>} panels - Records for the list panels, keyed by panel name.
 */

/**
 * Admin dashboard: account approvals, open requests, low stock and overdue equipment.
 * @returns {Promise<DashboardSummary>} Summary.
 */
const getAdminSummary = async () => {
  const [
    pendingAccounts,
    pendingRequests,
    lowStockItems,
    overdueEquipment,
    pendingAccountRows,
    lowStockRows,
  ] = await Promise.all([
    dashboardRepository.countUsersByStatus(USER_STATUS.PENDING),
    dashboardRepository.countRequests({ statuses: [REQUEST_STATUS.PENDING] }),
    dashboardRepository.countLowStockItems(),
    dashboardRepository.countOverdueBorrows({}),
    dashboardRepository.listPendingUsers(DASHBOARD_LIST_LIMIT),
    dashboardRepository.listLowStockItems(DASHBOARD_LIST_LIMIT),
  ]);

  return {
    stats: { pendingAccounts, pendingRequests, lowStockItems, overdueEquipment },
    panels: { pendingAccounts: pendingAccountRows, lowStock: lowStockRows },
  };
};

/**
 * Custodian dashboard: requests to review and release, low stock and overdue equipment.
 * @returns {Promise<DashboardSummary>} Summary.
 */
const getCustodianSummary = async () => {
  const [
    requestsToReview,
    readyToRelease,
    lowStockItems,
    overdueEquipment,
    requestRows,
    overdueRows,
  ] = await Promise.all([
    dashboardRepository.countRequests({ statuses: [REQUEST_STATUS.PENDING] }),
    dashboardRepository.countRequests({ statuses: [REQUEST_STATUS.APPROVED] }),
    dashboardRepository.countLowStockItems(),
    dashboardRepository.countOverdueBorrows({}),
    dashboardRepository.listRecentRequests({
      statuses: [REQUEST_STATUS.PENDING, REQUEST_STATUS.APPROVED],
      limit: DASHBOARD_LIST_LIMIT,
    }),
    dashboardRepository.listActiveBorrows({ overdueOnly: true, limit: DASHBOARD_LIST_LIMIT }),
  ]);

  return {
    stats: { requestsToReview, readyToRelease, lowStockItems, overdueEquipment },
    panels: { requestsToReview: requestRows, overdueEquipment: overdueRows },
  };
};

/**
 * Staff dashboard: the signed-in user's own requests and borrowed items only.
 * @param {number} userId - Signed-in user ID.
 * @returns {Promise<DashboardSummary>} Summary.
 */
const getStaffSummary = async (userId) => {
  const [
    myPendingRequests,
    myApprovedRequests,
    myBorrowedItems,
    myDueSoon,
    myRequestRows,
    myBorrowedRows,
  ] = await Promise.all([
    dashboardRepository.countRequests({ statuses: [REQUEST_STATUS.PENDING], requestedBy: userId }),
    dashboardRepository.countRequests({ statuses: [REQUEST_STATUS.APPROVED], requestedBy: userId }),
    dashboardRepository.countActiveBorrows({ borrowerId: userId }),
    dashboardRepository.countDueSoonBorrows({ borrowerId: userId, days: DUE_SOON_DAYS }),
    dashboardRepository.listRecentRequests({ requestedBy: userId, limit: DASHBOARD_LIST_LIMIT }),
    dashboardRepository.listActiveBorrows({ borrowerId: userId, limit: DASHBOARD_LIST_LIMIT }),
  ]);

  return {
    stats: { myPendingRequests, myApprovedRequests, myBorrowedItems, myDueSoon },
    panels: { myRequests: myRequestRows, myBorrowed: myBorrowedRows },
  };
};

/**
 * Returns the dashboard numbers and lists for the signed-in user's role.
 * @param {import('../repositories/users.repository.js').UserRecord} user - Signed-in user (req.user).
 * @returns {Promise<DashboardSummary>} Summary for that role.
 * @throws {import('../utils/errors.js').AppError} 403 for an unknown role.
 */
export const getDashboardSummary = async (user) => {
  if (user.roleCode === ROLES.ADMIN) {
    return getAdminSummary();
  }

  if (user.roleCode === ROLES.CUSTODIAN) {
    return getCustodianSummary();
  }

  if (user.roleCode === ROLES.STAFF) {
    return getStaffSummary(user.id);
  }

  throw createAppError('You are not allowed to do this', 403);
};
