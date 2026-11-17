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
  const pendingAccounts = await dashboardRepository.countUsersByStatus(USER_STATUS.PENDING);

  const pendingRequests = await dashboardRepository.countRequests({
    statuses: [REQUEST_STATUS.PENDING],
  });

  const lowStockItems = await dashboardRepository.countLowStockItems();
  const overdueEquipment = await dashboardRepository.countOverdueBorrows({});
  const pendingAccountRows = await dashboardRepository.listPendingUsers(DASHBOARD_LIST_LIMIT);
  const lowStockRows = await dashboardRepository.listLowStockItems(DASHBOARD_LIST_LIMIT);

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
  const requestsToReview = await dashboardRepository.countRequests({
    statuses: [REQUEST_STATUS.PENDING],
  });

  const readyToRelease = await dashboardRepository.countRequests({
    statuses: [REQUEST_STATUS.APPROVED],
  });

  const lowStockItems = await dashboardRepository.countLowStockItems();
  const overdueEquipment = await dashboardRepository.countOverdueBorrows({});

  const requestRows = await dashboardRepository.listRecentRequests({
    statuses: [REQUEST_STATUS.PENDING, REQUEST_STATUS.APPROVED],
    limit: DASHBOARD_LIST_LIMIT,
  });

  const overdueRows = await dashboardRepository.listActiveBorrows({
    overdueOnly: true,
    limit: DASHBOARD_LIST_LIMIT,
  });

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
  const myPendingRequests = await dashboardRepository.countRequests({
    statuses: [REQUEST_STATUS.PENDING],
    requestedBy: userId,
  });

  const myApprovedRequests = await dashboardRepository.countRequests({
    statuses: [REQUEST_STATUS.APPROVED],
    requestedBy: userId,
  });

  const myBorrowedItems = await dashboardRepository.countActiveBorrows({ borrowerId: userId });

  const myDueSoon = await dashboardRepository.countDueSoonBorrows({
    borrowerId: userId,
    days: DUE_SOON_DAYS,
  });

  const myRequestRows = await dashboardRepository.listRecentRequests({
    requestedBy: userId,
    limit: DASHBOARD_LIST_LIMIT,
  });

  const myBorrowedRows = await dashboardRepository.listActiveBorrows({
    borrowerId: userId,
    limit: DASHBOARD_LIST_LIMIT,
  });

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
