import { request } from './httpClient.js';

/**
 * Lists school positions for dropdowns (public; used on the registration page).
 * @returns {Promise<import('../utils/types.js').Position[]>} Positions.
 */
export const listPositions = () => request('/positions', { skipUnauthorizedHandler: true });
