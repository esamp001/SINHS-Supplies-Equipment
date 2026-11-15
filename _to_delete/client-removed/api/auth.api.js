import { request } from './httpClient.js';

/**
 * Signs in. The server sets the httpOnly auth cookie; no token is returned to JS.
 * @param {{ username: string, password: string }} credentials - Login credentials.
 * @returns {Promise<import('../utils/types.js').AuthUser>} Signed-in user.
 */
export const login = async (credentials) => {
  const { data } = await request('/auth/login', {
    method: 'POST',
    body: credentials,
    skipUnauthorizedHandler: true,
  });
  return data;
};

/**
 * Signs out and clears the auth cookie.
 * @returns {Promise<void>} Resolves when signed out.
 */
export const logout = async () => {
  await request('/auth/logout', { method: 'POST', skipUnauthorizedHandler: true });
};

/**
 * Loads the current user from the auth cookie (used on page load).
 * @returns {Promise<import('../utils/types.js').AuthUser>} Current user.
 */
export const getCurrentUser = async () => {
  const { data } = await request('/auth/me', { skipUnauthorizedHandler: true });
  return data;
};

/**
 * Submits a self-registration. The account starts as pending with no role.
 * @param {{ fullName: string, username: string, email: string, positionId: number, password: string }} payload - Registration details.
 * @returns {Promise<import('../utils/types.js').User>} Created (pending) user.
 */
export const register = async (payload) => {
  const { data } = await request('/auth/register', {
    method: 'POST',
    body: payload,
    skipUnauthorizedHandler: true,
  });
  return data;
};
