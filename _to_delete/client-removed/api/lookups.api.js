import { request } from './httpClient.js';

/**
 * Lists school positions for dropdowns. Public: used on the registration page.
 * @returns {Promise<import('../utils/types.js').Position[]>} Positions.
 */
export const listPositions = async () => {
  const { data } = await request('/positions', { skipUnauthorizedHandler: true });
  return data;
};
