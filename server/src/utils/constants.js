/**
 * Server-wide constants. Status/enum values are defined once here and reused (AGENTS.md §12.2).
 */

/** System role codes. Roles control permissions; positions never do. */
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  CUSTODIAN: 'custodian',
  STAFF: 'staff',
});

/** User account statuses. */
export const USER_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  DEACTIVATED: 'deactivated',
});

/** Audit log actions. */
export const AUDIT_ACTIONS = Object.freeze({
  CREATE: 'create',
  UPDATE: 'update',
  APPROVE: 'approve',
  REJECT: 'reject',
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGE: 'password_change',
  ROLE_CHANGE: 'role_change',
  STATUS_CHANGE: 'status_change',
});

/** Audit log entity types. */
export const ENTITY_TYPES = Object.freeze({
  USER: 'user',
});

/** In-app notification types. */
export const NOTIFICATION_TYPES = Object.freeze({
  ACCOUNT_REGISTERED: 'account_registered',
  ACCOUNT_APPROVED: 'account_approved',
  ACCOUNT_REJECTED: 'account_rejected',
});

/** Minimum password length for registration and password changes. */
export const MIN_PASSWORD_LENGTH = 8;

/** bcrypt cost factor (AGENTS.md §10: 10–12). */
export const BCRYPT_ROUNDS = 10;

/** Request statuses (AGENTS.md §9 workflow). */
export const REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RELEASED: 'released',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
});

/** Borrowed items due within this many days count as "due soon". */
export const DUE_SOON_DAYS = 2;

/** Max rows in each dashboard list panel. */
export const DASHBOARD_LIST_LIMIT = 5;
