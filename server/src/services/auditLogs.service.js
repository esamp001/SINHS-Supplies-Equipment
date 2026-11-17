import * as auditLogsRepository from '../repositories/auditLogs.repository.js';
import { buildMeta, parsePagination } from '../utils/pagination.js';
import { isPositiveInt, isValidDate } from '../utils/validators.js';

/**
 * Lists audit log entries with filters (Admin, read-only — audit logs are insert-only).
 * @param {{ page?: string, pageSize?: string, userId?: string, entityType?: string, action?: string, dateFrom?: string, dateTo?: string }} query - Query parameters.
 * @returns {Promise<{ rows: Array<import('../repositories/auditLogs.repository.js').AuditLogRecord>, meta: Object }>} Page of entries.
 */
export const listAuditLogs = async (query) => {
  const pagination = parsePagination(query);

  const filters = {
    userId: isPositiveInt(query.userId) ? Number(query.userId) : undefined,
    entityType: typeof query.entityType === 'string' ? query.entityType.trim() : undefined,
    action: typeof query.action === 'string' ? query.action.trim() : undefined,
    dateFrom: isValidDate(query.dateFrom) ? query.dateFrom : undefined,
    dateTo: isValidDate(query.dateTo) ? query.dateTo : undefined,
  };

  const { rows, total } = await auditLogsRepository.list(filters, pagination);

  return { rows, meta: buildMeta(pagination, total) };
};

/**
 * Returns the actions and entity types that can be filtered on.
 * @returns {Promise<{ actions: string[], entityTypes: string[] }>} Filter values.
 */
export const getAuditLogFilters = async () => auditLogsRepository.listFilterValues();
