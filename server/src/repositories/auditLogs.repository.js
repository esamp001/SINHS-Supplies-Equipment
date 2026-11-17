import { db } from '../config/db.js';

/**
 * Inserts an audit log row. Audit logs are insert-only (AGENTS.md §9).
 * @param {{ userId: number | null, action: string, entityType: string, entityId: number | null, before?: Object | null, after?: Object | null, ipAddress?: string | null }} entry - Audit entry.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<void>}
 */
export const create = async (entry, trx = db) => {
  await trx('audit_logs').insert({
    user_id: entry.userId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    before: entry.before ? JSON.stringify(entry.before) : null,
    after: entry.after ? JSON.stringify(entry.after) : null,
    ip_address: entry.ipAddress || null,
  });
};

/**
 * @typedef {Object} AuditLogRecord
 * @property {number} id - Entry ID.
 * @property {number | null} userId - Who did it.
 * @property {string | null} userName - Their name.
 * @property {string} action - Action.
 * @property {string} entityType - What was changed.
 * @property {number | null} entityId - ID of what was changed.
 * @property {Object | null} before - Values before.
 * @property {Object | null} after - Values after.
 * @property {string | null} ipAddress - Client IP.
 * @property {string} createdAt - ISO timestamp.
 */

/**
 * Applies audit log filters. Dates are Manila calendar dates (the session timezone).
 * @param {import('knex').Knex.QueryBuilder} query - Query.
 * @param {{ userId?: number, entityType?: string, action?: string, dateFrom?: string, dateTo?: string }} filters - Filters.
 * @returns {import('knex').Knex.QueryBuilder} The same query.
 */
const applyFilters = (query, filters) => {
  if (filters.userId) {
    query.where('audit_logs.user_id', filters.userId);
  }

  if (filters.entityType) {
    query.where('audit_logs.entity_type', filters.entityType);
  }

  if (filters.action) {
    query.where('audit_logs.action', filters.action);
  }

  if (filters.dateFrom) {
    query.where('audit_logs.created_at', '>=', filters.dateFrom);
  }

  if (filters.dateTo) {
    query.whereRaw("audit_logs.created_at < (?::date + interval '1 day')", [filters.dateTo]);
  }

  return query;
};

/**
 * Lists audit log entries, newest first, with pagination.
 * @param {Object} filters - See `applyFilters`.
 * @param {{ pageSize: number, offset: number }} pagination - Page window.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<{ rows: AuditLogRecord[], total: number }>} Page and total.
 */
export const list = async (filters, pagination, trx = db) => {
  const countRow = await applyFilters(trx('audit_logs'), filters)
    .count('audit_logs.id as count')
    .first();

  const rows = await applyFilters(
    trx('audit_logs').leftJoin('users', 'users.id', 'audit_logs.user_id'),
    filters,
  )
    .select(
      'audit_logs.id',
      'audit_logs.user_id',
      'users.full_name as user_name',
      'audit_logs.action',
      'audit_logs.entity_type',
      'audit_logs.entity_id',
      'audit_logs.before',
      'audit_logs.after',
      'audit_logs.ip_address',
      'audit_logs.created_at',
    )
    .orderBy('audit_logs.created_at', 'desc')
    .orderBy('audit_logs.id', 'desc')
    .limit(pagination.pageSize)
    .offset(pagination.offset);

  return {
    total: Number(countRow.count),
    rows: rows.map((row) => ({
      id: Number(row.id),
      userId: row.user_id,
      userName: row.user_name,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      before: row.before,
      after: row.after,
      ipAddress: row.ip_address,
      createdAt: row.created_at,
    })),
  };
};

/**
 * Lists the distinct actions and entity types that appear in the log (for filter dropdowns).
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<{ actions: string[], entityTypes: string[] }>} Distinct values.
 */
export const listFilterValues = async (trx = db) => {
  const [actions, entityTypes] = await Promise.all([
    trx('audit_logs').distinct('action').orderBy('action'),
    trx('audit_logs').distinct('entity_type').orderBy('entity_type'),
  ]);

  return {
    actions: actions.map((row) => row.action),
    entityTypes: entityTypes.map((row) => row.entity_type),
  };
};
