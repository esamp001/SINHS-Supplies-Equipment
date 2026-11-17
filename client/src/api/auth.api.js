import { request } from './httpClient.js';

/**
 * Signs in. The server sets the httpOnly auth cookie; no token is returned to JS.
 * @param {{ username: string, password: string, rememberMe: boolean }} credentials - Login form values.
 * @returns {Promise<import('../utils/types.js').AuthUser>} Signed-in user.
 */
export const login = (credentials) =>
  request('/auth/login', { method: 'POST', body: credentials, skipUnauthorizedHandler: true });

/**
 * Signs out and clears the auth cookie.
 * @returns {Promise<null>} Resolves when signed out.
 */
export const logout = () =>
  request('/auth/logout', { method: 'POST', skipUnauthorizedHandler: true });

/**
 * Loads the signed-in user from the auth cookie (used when the page loads).
 * @returns {Promise<import('../utils/types.js').AuthUser>} Current user.
 */
export const getCurrentUser = () => request('/auth/me', { skipUnauthorizedHandler: true });

/**
 * Submits a self-registration. The account starts as pending with no role.
 * @param {{ fullName: string, username: string, email: string, positionId: number, password: string, confirmPassword: string }} formData - Registration form values.
 * @returns {Promise<import('../utils/types.js').User>} Created (pending) user.
 */
export const register = (formData) =>
  request('/auth/register', { method: 'POST', body: formData, skipUnauthorizedHandler: true });

/**
 * Changes the signed-in user's password (required after an admin reset).
 * @param {{ currentPassword: string, newPassword: string, confirmPassword: string }} formData - Form values.
 * @returns {Promise<import('../utils/types.js').AuthUser>} Updated user.
 */
export const changePassword = (formData) =>
  request('/auth/change-password', { method: 'PUT', body: formData });
