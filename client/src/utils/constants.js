/**
 * App-wide constants. Status/enum values are defined once here and reused (AGENTS.md §12.2).
 */

/** School details shown in the UI and report headers. */
export const SCHOOL = Object.freeze({
  shortName: 'SINHS',
  name: 'San Isidro National High School',
  location: 'Malilipot, Albay',
  established: 2000,
  systemName: 'Supplies & Equipment Management',
});

/** Application timezone (AGENTS.md §8). */
export const APP_TIMEZONE = 'Asia/Manila';

/** Minimum password length for registration and password changes. */
export const MIN_PASSWORD_LENGTH = 8;

/** System role codes. Roles control permissions; positions never do. */
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  CUSTODIAN: 'custodian',
  STAFF: 'staff',
});

/** Display labels for role codes. */
export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Admin',
  [ROLES.CUSTODIAN]: 'Custodian',
  [ROLES.STAFF]: 'Staff',
});

/** Role options for Ant Design Select components. */
export const ROLE_OPTIONS = Object.freeze([
  { value: ROLES.STAFF, label: ROLE_LABELS[ROLES.STAFF] },
  { value: ROLES.CUSTODIAN, label: ROLE_LABELS[ROLES.CUSTODIAN] },
  { value: ROLES.ADMIN, label: ROLE_LABELS[ROLES.ADMIN] },
]);

/** User account statuses. */
export const USER_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  DEACTIVATED: 'deactivated',
});

/** Request statuses. */
export const REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RELEASED: 'released',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
});

/**
 * Status tag display config: label + Ant Design Tag color.
 * Keys cover request, user, stock and borrowing statuses.
 */
export const STATUS_TAGS = Object.freeze({
  pending: { label: 'Pending', color: 'gold' },
  approved: { label: 'Approved', color: 'blue' },
  released: { label: 'Released', color: 'green' },
  returned: { label: 'Returned', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'default' },
  overdue: { label: 'Overdue', color: 'red' },
  dueSoon: { label: 'Due soon', color: 'gold' },
  lowStock: { label: 'Low stock', color: 'red' },
  active: { label: 'Active', color: 'green' },
  deactivated: { label: 'Deactivated', color: 'default' },
});

/** Brand colors (mirrors the design prototype). Prefer theme tokens in components. */
export const BRAND_COLORS = Object.freeze({
  navy: '#123A7A',
  primary: '#1F4FA8',
  link: '#1A4494',
  gold: '#E8B71A',
  goldSoft: '#FCF3D6',
  goldText: '#5A3E00',
  blueSoft: '#E8EEF9',
  pageBg: '#F5F7FA',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#475569',
});
