import { request } from './httpClient.js';

/**
 * Loads the role-based dashboard summary for the signed-in user.
 * @returns {Promise<import('../utils/types.js').DashboardSummary>} Stats and panel rows.
 */
export const getDashboardSummary = async () => {
  const { data } = await request('/dashboard/summary');
  return data;
};
