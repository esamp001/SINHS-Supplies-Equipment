import { listUsers } from '../api/users.api.js';
import { useApiQuery } from './useApiQuery.js';

/**
 * Loads users filtered by status and search text.
 * @param {{ status?: import('../utils/types.js').UserStatus, search?: string }} [filters] - Filters.
 * @returns {import('./useApiQuery.js').ApiQueryState<import('../utils/types.js').User[]>} Query state.
 */
export const useUsers = ({ status, search } = {}) =>
  useApiQuery(() => listUsers({ status, search }), [status, search]);
