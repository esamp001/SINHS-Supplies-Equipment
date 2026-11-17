import { ROLES } from '../utils/constants.js';

/** Route paths used across the app. */
export const PATHS = Object.freeze({
  LOGIN: '/login',
  REGISTER: '/register',
  CHANGE_PASSWORD: '/change-password',
  DASHBOARD: '/dashboard',
  ITEMS: '/items',
  STOCK_TRANSACTIONS: '/stock-transactions',
  REQUESTS: '/requests',
  BORROWING: '/borrowing',
  ITEM_TYPES: '/item-types',
  REPORTS: '/reports',
  USERS: '/users',
  MASTER_DATA: '/master-data',
  AUDIT_LOG: '/audit-log',
  AVAILABLE_ITEMS: '/available-items',
  MY_REQUESTS: '/my-requests',
  MY_BORROWED: '/my-borrowed',
});

const { ADMIN, CUSTODIAN, STAFF } = ROLES;

/**
 * Pages not built yet (rendered with the "coming soon" placeholder) and who can open them.
 * The server enforces every permission; this only controls navigation (AGENTS.md §10).
 * @type {Array<{ path: string, title: string, roles: string[] }>}
 */
export const PLACEHOLDER_PAGES = [
  { path: PATHS.ITEMS, title: 'Items', roles: [ADMIN, CUSTODIAN] },
  { path: PATHS.STOCK_TRANSACTIONS, title: 'Stock transactions', roles: [ADMIN, CUSTODIAN] },
  { path: PATHS.REQUESTS, title: 'Requests', roles: [ADMIN, CUSTODIAN] },
  { path: PATHS.BORROWING, title: 'Borrowing & returns', roles: [ADMIN, CUSTODIAN] },
  { path: PATHS.REPORTS, title: 'Reports', roles: [ADMIN, CUSTODIAN] },
  { path: PATHS.AUDIT_LOG, title: 'Audit log', roles: [ADMIN] },
  { path: PATHS.AVAILABLE_ITEMS, title: 'Available items', roles: [STAFF] },
  { path: PATHS.MY_REQUESTS, title: 'My requests', roles: [STAFF] },
  { path: PATHS.MY_BORROWED, title: 'My borrowed items', roles: [STAFF] },
];

/**
 * Side navigation groups per role (from the design prototype).
 * @type {Object<string, Array<{ label: string, items: Array<{ path: string, label: string }> }>>}
 */
export const NAV_GROUPS_BY_ROLE = {
  [ADMIN]: [
    {
      label: 'Inventory',
      items: [
        { path: PATHS.DASHBOARD, label: 'Dashboard' },
        { path: PATHS.ITEMS, label: 'Items' },
        { path: PATHS.STOCK_TRANSACTIONS, label: 'Stock transactions' },
        { path: PATHS.REQUESTS, label: 'Requests' },
        { path: PATHS.BORROWING, label: 'Borrowing & returns' },
        { path: PATHS.ITEM_TYPES, label: 'Item types & fields' },
        { path: PATHS.REPORTS, label: 'Reports' },
      ],
    },
    {
      label: 'Administration',
      items: [
        { path: PATHS.USERS, label: 'Users & accounts' },
        { path: PATHS.MASTER_DATA, label: 'Master data' },
        { path: PATHS.AUDIT_LOG, label: 'Audit log' },
      ],
    },
  ],
  [CUSTODIAN]: [
    {
      label: 'Inventory',
      items: [
        { path: PATHS.DASHBOARD, label: 'Dashboard' },
        { path: PATHS.ITEMS, label: 'Items' },
        { path: PATHS.STOCK_TRANSACTIONS, label: 'Stock transactions' },
        { path: PATHS.REQUESTS, label: 'Requests to review' },
        { path: PATHS.BORROWING, label: 'Borrowing & returns' },
        { path: PATHS.ITEM_TYPES, label: 'Item types & fields' },
        { path: PATHS.REPORTS, label: 'Reports' },
      ],
    },
  ],
  [STAFF]: [
    {
      label: 'Menu',
      items: [
        { path: PATHS.DASHBOARD, label: 'Dashboard' },
        { path: PATHS.AVAILABLE_ITEMS, label: 'Available items' },
        { path: PATHS.MY_REQUESTS, label: 'My requests' },
        { path: PATHS.MY_BORROWED, label: 'My borrowed items' },
      ],
    },
  ],
};
