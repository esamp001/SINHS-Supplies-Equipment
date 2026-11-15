import { getDashboardSummary } from '../api/dashboard.api.js';
import { useApiQuery } from './useApiQuery.js';

/**
 * Loads the signed-in user's dashboard summary.
 * @returns {import('./useApiQuery.js').ApiQueryState<import('../utils/types.js').DashboardSummary>} Query state.
 */
export const useDashboard = () => useApiQuery(getDashboardSummary);
