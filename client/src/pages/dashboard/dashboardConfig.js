import homeAdminUrl from '../../assets/images/homeAdmin.svg';
import homeCustodianUrl from '../../assets/images/homeCustodian.svg';
import homeStaffUrl from '../../assets/images/homeStaff.svg';
import { PATHS } from '../../routes/navConfig.js';
import { ROLES } from '../../utils/constants.js';

/**
 * @typedef {Object} DashboardRoleConfig
 * @property {string} description - Text under the greeting.
 * @property {string} illustrationUrl - Hero illustration.
 * @property {Array<{ label: string, path: string }>} actions - Quick actions; the first is primary.
 * @property {Array<{ key: string, label: string, value: number, note: string }>} stats - Stat cards.
 * @property {Array<{ key: string, title: string, path: string, rows: import('../../utils/types.js').PanelRow[] }>} panels - List panels.
 */

/**
 * Per-role dashboard from the design prototype, with static sample numbers and rows.
 * Each role only sees its own dashboard (role-based access).
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
        value: 3,
        note: 'Self-registered personnel',
      },
      {
        key: 'pendingRequests',
        label: 'Pending requests',
        value: 5,
        note: 'Waiting for a custodian',
      },
      {
        key: 'lowStockItems',
        label: 'Low-stock items',
        value: 3,
        note: 'At or below reorder level',
      },
      {
        key: 'overdueEquipment',
        label: 'Overdue equipment',
        value: 2,
        note: 'Past due date, not returned',
      },
    ],
    panels: [
      {
        key: 'pendingAccounts',
        title: 'New accounts awaiting approval',
        path: PATHS.USERS,
        rows: [
          {
            id: 5,
            main: 'Liza M. Bautista',
            sub: 'Teacher I · registered Nov 12, 2026',
            status: 'pending',
          },
          {
            id: 6,
            main: 'Ramon D. Garcia',
            sub: 'Supply Officer · registered Nov 13, 2026',
            status: 'pending',
          },
          {
            id: 7,
            main: 'Grace A. Mendoza',
            sub: 'Teacher III · registered Nov 14, 2026',
            status: 'pending',
          },
        ],
      },
      {
        key: 'lowStock',
        title: 'Low stock',
        path: PATHS.ITEMS,
        rows: [
          {
            id: 1,
            main: 'Bond paper, A4',
            sub: '4 reams left · reorder at 10',
            status: 'lowStock',
          },
          {
            id: 2,
            main: 'Whiteboard marker, black',
            sub: '6 pcs left · reorder at 20',
            status: 'lowStock',
          },
          {
            id: 3,
            main: 'Printer ink, Epson 003 black',
            sub: '1 bottle left · reorder at 3',
            status: 'lowStock',
          },
        ],
      },
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
      {
        key: 'requestsToReview',
        label: 'Requests to review',
        value: 5,
        note: 'Supply and borrow requests',
      },
      {
        key: 'readyToRelease',
        label: 'Ready to release',
        value: 2,
        note: 'Approved, not yet released',
      },
      {
        key: 'lowStockItems',
        label: 'Low-stock items',
        value: 3,
        note: 'At or below reorder level',
      },
      {
        key: 'overdueEquipment',
        label: 'Overdue equipment',
        value: 2,
        note: 'Past due date, not returned',
      },
    ],
    panels: [
      {
        key: 'requestsToReview',
        title: 'Requests awaiting your review',
        path: PATHS.REQUESTS,
        rows: [
          {
            id: 11,
            main: 'Ana P. Reyes',
            sub: 'Supply · Bond paper, A4 · 5 reams',
            status: 'pending',
          },
          {
            id: 12,
            main: 'Carlo B. Ramos',
            sub: 'Borrow · Projector · due Nov 18',
            status: 'pending',
          },
          {
            id: 13,
            main: 'Ana P. Reyes',
            sub: 'Supply · Chalk, white · ready to release',
            status: 'approved',
          },
        ],
      },
      {
        key: 'overdueEquipment',
        title: 'Overdue equipment',
        path: PATHS.BORROWING,
        rows: [
          {
            id: 21,
            main: 'Carlo B. Ramos',
            sub: 'Laptop · PROP-2024-0012 · due Nov 10',
            status: 'overdue',
          },
          {
            id: 22,
            main: 'Ella F. Cruz',
            sub: 'Projector · PROP-2023-0004 · due Nov 12',
            status: 'overdue',
          },
        ],
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
      {
        key: 'myPendingRequests',
        label: 'My pending requests',
        value: 1,
        note: 'Waiting for the custodian',
      },
      {
        key: 'myApprovedRequests',
        label: 'Approved, to pick up',
        value: 1,
        note: 'Ready for release',
      },
      {
        key: 'myBorrowedItems',
        label: 'Items I have borrowed',
        value: 2,
        note: 'Not yet returned',
      },
      { key: 'myDueSoon', label: 'Due soon', value: 1, note: 'Return within 2 days' },
    ],
    panels: [
      {
        key: 'myRequests',
        title: 'My recent requests',
        path: PATHS.MY_REQUESTS,
        rows: [
          {
            id: 31,
            main: 'Bond paper, A4 · 5 reams',
            sub: 'Supply request · Nov 14',
            status: 'pending',
          },
          { id: 32, main: 'Projector', sub: 'Borrow request · needed Nov 17', status: 'approved' },
          {
            id: 33,
            main: 'Whiteboard marker · 10 pcs',
            sub: 'Supply request · Nov 10',
            status: 'released',
          },
          {
            id: 34,
            main: 'Laminating film',
            sub: 'Reason: out of stock until December',
            status: 'rejected',
          },
        ],
      },
      {
        key: 'myBorrowed',
        title: 'Borrowed by me',
        path: PATHS.MY_BORROWED,
        rows: [
          { id: 41, main: 'Laptop · PROP-2024-0020', sub: 'Due Nov 16', status: 'dueSoon' },
          { id: 42, main: 'Extension cord · PROP-2022-0101', sub: 'Due Nov 12', status: 'overdue' },
        ],
      },
    ],
  },
};
