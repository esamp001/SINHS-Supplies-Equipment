import { request } from './httpClient.js';

/**
 * Lists users. Without a status, returns active and deactivated users.
 * @param {{ status?: import('../utils/types.js').UserStatus, search?: string }} [params] - Filters.
 * @returns {Promise<import('../utils/types.js').User[]>} Users.
 */
export const listUsers = async (params) => {
  const { data } = await request('/users', { params });
  return data;
};

/**
 * Approves a pending registration and assigns a role and position.
 * @param {number} userId - User ID.
 * @param {{ roleCode: import('../utils/types.js').RoleCode, positionId: number }} payload - Role and position.
 * @returns {Promise<import('../utils/types.js').User>} Updated user.
 */
export const approveUser = async (userId, payload) => {
  const { data } = await request(`/users/${userId}/approve`, { method: 'POST', body: payload });
  return data;
};

/**
 * Rejects a pending registration.
 * @param {number} userId - User ID.
 * @param {string} reason - Required rejection reason.
 * @returns {Promise<import('../utils/types.js').User>} Updated user.
 */
export const rejectUser = async (userId, reason) => {
  const { data } = await request(`/users/${userId}/reject`, { method: 'POST', body: { reason } });
  return data;
};

/**
 * Changes a user's role.
 * @param {number} userId - User ID.
 * @param {import('../utils/types.js').RoleCode} roleCode - New role.
 * @returns {Promise<import('../utils/types.js').User>} Updated user.
 */
export const changeUserRole = async (userId, roleCode) => {
  const { data } = await request(`/users/${userId}/role`, { method: 'PUT', body: { roleCode } });
  return data;
};

/**
 * Resets a user's password to a temporary one (must be changed at next sign-in).
 * @param {number} userId - User ID.
 * @returns {Promise<{ temporaryPassword: string }>} Temporary password to give the user.
 */
export const resetUserPassword = async (userId) => {
  const { data } = await request(`/users/${userId}/reset-password`, { method: 'POST' });
  return data;
};

/**
 * Activates or deactivates a user.
 * @param {number} userId - User ID.
 * @param {'active' | 'deactivated'} status - New status.
 * @returns {Promise<import('../utils/types.js').User>} Updated user.
 */
export const changeUserStatus = async (userId, status) => {
  const { data } = await request(`/users/${userId}/status`, { method: 'PUT', body: { status } });
  return data;
};
