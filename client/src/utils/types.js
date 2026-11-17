/**
 * Shared JSDoc type definitions (AGENTS.md §12.4). This file has no runtime code.
 */

/**
 * @typedef {'admin' | 'custodian' | 'staff'} RoleCode
 */

/**
 * @typedef {'pending' | 'active' | 'rejected' | 'deactivated'} UserStatus
 */

/**
 * @typedef {Object} Position
 * @property {number} id - Position ID.
 * @property {string} name - Display name, e.g. "Teacher I".
 */

/**
 * @typedef {Object} AuthUser
 * @property {number} id - User ID.
 * @property {string} username - Login username.
 * @property {string} fullName - Full name.
 * @property {string} email - Email address.
 * @property {RoleCode} roleCode - System role.
 * @property {number} positionId - Position ID.
 * @property {string} positionName - School position label.
 * @property {'active'} status - Always active for a signed-in user.
 * @property {boolean} mustChangePassword - True after an admin password reset.
 * @property {string | null} lastLoginAt - ISO timestamp of the last sign-in.
 */

/**
 * @typedef {Object} User
 * @property {number} id - User ID.
 * @property {string} username - Login username.
 * @property {string} fullName - Full name.
 * @property {string} email - Email address.
 * @property {RoleCode | null} roleCode - System role (null while pending).
 * @property {number} positionId - Position ID.
 * @property {string} positionName - Position label.
 * @property {UserStatus} status - Account status.
 * @property {string} createdAt - ISO timestamp of registration.
 * @property {string | null} lastLoginAt - ISO timestamp of last sign-in.
 */

/**
 * @typedef {Object} PanelRow
 * @property {string | number} id - Row ID.
 * @property {string} main - Primary text.
 * @property {string} sub - Secondary text.
 * @property {string} status - Key of STATUS_TAGS.
 */

/**
 * @typedef {Object} DashboardSummary
 * @property {Object<string, number>} stats - Stat values keyed by stat key (GET /dashboard/summary).
 * @property {Object<string, Array<Object>>} panels - Raw records keyed by panel key; each panel's
 *   `toRow` in dashboardConfig.js turns a record into a PanelRow.
 */

export {};
