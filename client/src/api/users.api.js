import { request } from './httpClient.js';

/**
 * Lists users. Without a status, returns active and deactivated users (Admin only).
 * @param {{ status?: import('../utils/types.js').UserStatus, search?: string }} [params] - Filters.
 * @returns {Promise<import('../utils/types.js').User[]>} Users.
 */
export const listUsers = (params) => request('/users', { params });

/**
 * Approves a pending registration and assigns a role and position.
 * @param {number} userId - User ID.
 * @param {{ roleCode: import('../utils/types.js').RoleCode, positionId: number }} payload - Role and position.
 * @returns {Promise<import('../utils/types.js').User>} Updated user.
 */
export const approveUser = (userId, payload) =>
  request(`/users/${userId}/approve`, { method: 'POST', body: payload });

/**
 * Rejects a pending registration.
 * @param {number} userId - User ID.
 * @param {string} reason - Required reason.
 * @returns {Promise<import('../utils/types.js').User>} Updated user.
 */
export const rejectUser = (userId, reason) =>
  request(`/users/${userId}/reject`, { method: 'POST', body: { reason } });

/**
 * Changes a user's role.
 * @param {number} userId - User ID.
 * @param {import('../utils/types.js').RoleCode} roleCode - New role.
 * @returns {Promise<import('../utils/types.js').User>} Updated user.
 */
export const changeUserRole = (userId, roleCode) =>
  request(`/users/${userId}/role`, { method: 'PUT', body: { roleCode } });

/**
 * Resets a user's password to a temporary one (must be changed at next sign-in).
 * @param {number} userId - User ID.
 * @returns {Promise<{ temporaryPassword: string }>} Temporary password to give to the user.
 */
export const resetUserPassword = (userId) =>
  request(`/users/${userId}/reset-password`, { method: 'POST' });

/**
 * Activates or deactivates a user.
 * @param {number} userId - User ID.
 * @param {'active' | 'deactivated'} status - New status.
 * @returns {Promise<import('../utils/types.js').User>} Updated user.
 */
export const changeUserStatus = (userId, status) =>
  request(`/users/${userId}/status`, { method: 'PUT', body: { status } });
