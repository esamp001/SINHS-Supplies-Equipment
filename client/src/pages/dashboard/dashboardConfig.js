import dayjs from 'dayjs';

import homeAdminUrl from '../../assets/images/homeAdmin.svg';
import homeCustodianUrl from '../../assets/images/homeCustodian.svg';
import homeStaffUrl from '../../assets/images/homeStaff.svg';
import { PATHS } from '../../routes/navConfig.js';
import { DUE_SOON_DAYS, ROLES } from '../../utils/constants.js';
import { formatDate, formatDateOnly } from '../../utils/dateFormat.js';

/**
 * @typedef {import('../../utils/types.js').PanelRow} PanelRow
 */

/**
 * @typedef {Object} DashboardRoleConfig
 * @property {string} description - Text under the greeting.
 * @property {string} illustrationUrl - Hero illustration.
 * @property {Array<{ label: string, path: string }>} actions - Quick actions; the first is primary.
 * @property {Array<{ key: string, label: string, note: string }>} stats - Stat cards; `key` matches `summary.stats`.
 * @property {Array<{ key: string, title: string, path: string, toRow: (record: Object) => PanelRow }>} panels - List panels; `key` matches `summary.panels`.
 */

/** Display names for request types. */
const REQUEST_TYPE_LABELS = { supply: 'Supply', borrow: 'Borrow' };

/**
 * Decides the tag for a borrowed item: overdue, due soon, or simply borrowed.
 * @param {string} dueAt - ISO due date.
 * @returns {'overdue' | 'dueSoon' | 'borrowed'} Status tag key.
 */
const getBorrowStatus = (dueAt) => {
  const due = dayjs(dueAt);

  if (due.isBefore(dayjs())) {
    return 'overdue';
  }

  if (due.isBefore(dayjs().add(DUE_SOON_DAYS, 'day'))) {
    return 'dueSoon';
  }

  return 'borrowed';
};

/**
 * Pending registration → row (Admin).
 * @param {{ id: number, fullName: string, positionName: string, createdAt: string }} user - Pending user.
 * @returns {PanelRow} Row.
 */
const toPendingAccountRow = (user) => ({
  id: user.id,
  main: user.fullName,
  sub: `${user.positionName} · registered ${formatDate(user.createdAt)}`,
  status: 'pending',
});

/**
 * Low-stock item → row (Admin).
 * @param {{ id: number, name: string, quantityOnHand: number, reorderLevel: number, unitName: string }} item - Item.
 * @returns {PanelRow} Row.
 */
const toLowStockRow = (item) => ({
  id: item.id,
  main: item.name,
  sub: `${item.quantityOnHand} ${item.unitName} left · reorder at ${item.reorderLevel}`,
  status: 'lowStock',
});

/**
 * Request awaiting review or release → row (Custodian).
 * @param {{ id: number, requestType: string, status: string, requesterName: string, itemSummary: string | null, neededAt: string | null }} request - Request.
 * @returns {PanelRow} Row.
 */
const toReviewRequestRow = (request) => {
  const neededText = request.neededAt
    ? ` · needed ${formatDateOnly(request.neededAt, 'MMM D')}`
    : '';

  return {
    id: request.id,
    main: request.requesterName,
    sub: `${REQUEST_TYPE_LABELS[request.requestType]} · ${request.itemSummary || 'No items'}${neededText}`,
    status: request.status,
  };
};

/**
 * Overdue borrow record → row (Custodian).
 * @param {{ id: number, borrowerName: string, itemSummary: string | null, dueAt: string }} borrow - Borrow record.
 * @returns {PanelRow} Row.
 */
const toOverdueRow = (borrow) => ({
  id: borrow.id,
  main: borrow.borrowerName,
  sub: `${borrow.itemSummary || 'Equipment'} · due ${formatDate(borrow.dueAt, 'MMM D')}`,
  status: 'overdue',
});

/**
 * The user's own request → row (Staff). Rejected requests show the reason.
 * @param {{ id: number, requestType: string, status: string, itemSummary: string | null, rejectionReason: string | null, createdAt: string }} request - Request.
 * @returns {PanelRow} Row.
 */
const toMyRequestRow = (request) => ({
  id: request.id,
  main: request.itemSummary || 'Request',
  sub:
    request.status === 'rejected' && request.rejectionReason
      ? `Reason: ${request.rejectionReason}`
      : `${REQUEST_TYPE_LABELS[request.requestType]} request · ${formatDate(request.createdAt, 'MMM D')}`,
  status: request.status,
});

/**
 * The user's own borrowed equipment → row (Staff).
 * @param {{ id: number, itemSummary: string | null, dueAt: string }} borrow - Borrow record.
 * @returns {PanelRow} Row.
 */
const toMyBorrowRow = (borrow) => ({
  id: borrow.id,
  main: borrow.itemSummary || 'Equipment',
  sub: `Due ${formatDate(borrow.dueAt, 'MMM D')}`,
  status: getBorrowStatus(borrow.dueAt),
});

/**
 * Per-role dashboard layout. Numbers and lists come from GET /dashboard/summary;
 * each role only receives and sees its own dashboard (role-based access).
 * @type {Object<string, DashboardRoleConfig>}
 */
export const DASHBOARD_BY_ROLE = {
  [ROLES.ADMIN]: {
    description:
      'Approve new accounts, manage users and master data, and see every report. You can also act as custodian when needed.',
    illustrationUrl: homeAdminUrl,
    actions: [
      { label: 'Review new accounts', path: PATHS.USERS },
      { label: 'Add item type', path: PATHS.ITEM_TYPES },
      { label: 'Export report', path: PATHS.REPORTS },
    ],
    stats: [
      {
        key: 'pendingAccounts',
        label: 'Accounts awaiting approval',
        note: 'Self-registered personnel',
      },
      { key: 'pendingRequests', label: 'Pending requests', note: 'Waiting for a custodian' },
      { key: 'lowStockItems', label: 'Low-stock items', note: 'At or below reorder level' },
      { key: 'overdueEquipment', label: 'Overdue equipment', note: 'Past due date, not returned' },
    ],
    panels: [
      {
        key: 'pendingAccounts',
        title: 'New accounts awaiting approval',
        path: PATHS.USERS,
        toRow: toPendingAccountRow,
      },
      { key: 'lowStock', title: 'Low stock', path: PATHS.ITEMS, toRow: toLowStockRow },
    ],
  },
  [ROLES.CUSTODIAN]: {
    description:
      'Review requests, release approved items, and keep stock and equipment records accurate.',
    illustrationUrl: homeCustodianUrl,
    actions: [
      { label: 'Review requests', path: PATHS.REQUESTS },
      { label: 'Stock in', path: PATHS.STOCK_TRANSACTIONS },
      { label: 'Record a return', path: PATHS.BORROWING },
    ],
    stats: [
      { key: 'requestsToReview', label: 'Requests to review', note: 'Supply and borrow requests' },
      { key: 'readyToRelease', label: 'Ready to release', note: 'Approved, not yet released' },
      { key: 'lowStockItems', label: 'Low-stock items', note: 'At or below reorder level' },
      { key: 'overdueEquipment', label: 'Overdue equipment', note: 'Past due date, not returned' },
    ],
    panels: [
      {
        key: 'requestsToReview',
        title: 'Requests awaiting your review',
        path: PATHS.REQUESTS,
        toRow: toReviewRequestRow,
      },
      {
        key: 'overdueEquipment',
        title: 'Overdue equipment',
        path: PATHS.BORROWING,
        toRow: toOverdueRow,
      },
    ],
  },
  [ROLES.STAFF]: {
    description:
      'Browse available items, request supplies, borrow equipment and follow the status of your requests.',
    illustrationUrl: homeStaffUrl,
    actions: [
      { label: 'Request supplies', path: PATHS.AVAILABLE_ITEMS },
      { label: 'Borrow equipment', path: PATHS.AVAILABLE_ITEMS },
    ],
    stats: [
      { key: 'myPendingRequests', label: 'My pending requests', note: 'Waiting for the custodian' },
      { key: 'myApprovedRequests', label: 'Approved, to pick up', note: 'Ready for release' },
      { key: 'myBorrowedItems', label: 'Items I have borrowed', note: 'Not yet returned' },
      { key: 'myDueSoon', label: 'Due soon', note: `Return within ${DUE_SOON_DAYS} days` },
    ],
    panels: [
      {
        key: 'myRequests',
        title: 'My recent requests',
        path: PATHS.MY_REQUESTS,
        toRow: toMyRequestRow,
      },
      {
        key: 'myBorrowed',
        title: 'Borrowed by me',
        path: PATHS.MY_BORROWED,
        toRow: toMyBorrowRow,
      },
    ],
  },
};
