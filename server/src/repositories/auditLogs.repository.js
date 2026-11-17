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
