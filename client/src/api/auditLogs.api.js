import { request } from './httpClient.js';

/**
 * Lists audit log entries, newest first (Admin only).
 * @param {{ page?: number, pageSize?: number, userId?: number, entityType?: string, action?: string, dateFrom?: string, dateTo?: string }} [params] - Filters.
 * @returns {Promise<{ data: import('../utils/types.js').AuditLogEntry[], meta: import('../utils/types.js').PageMeta }>} Page of entries.
 */
export const listAuditLogs = (params) => request('/audit-logs', { params, withMeta: true });

/**
 * Lists the actions and entity types that appear in the audit log (for filter dropdowns).
 * @returns {Promise<{ actions: string[], entityTypes: string[] }>} Filter values.
 */
export const getAuditLogFilters = () => request('/audit-logs/filters');
