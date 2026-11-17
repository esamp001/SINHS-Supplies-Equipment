import { request } from './httpClient.js';

/**
 * Loads the dashboard numbers and lists for the signed-in user's role.
 * @returns {Promise<import('../utils/types.js').DashboardSummary>} Summary.
 */
export const getDashboardSummary = () => request('/dashboard/summary');
