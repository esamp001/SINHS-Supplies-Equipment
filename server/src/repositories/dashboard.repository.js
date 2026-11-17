import { db } from '../config/db.js';

/**
 * Read-only queries for the role-based dashboards. Repositories return plain camelCase data;
 * the service decides which numbers and lists each role sees.
 */

/**
 * Converts a Postgres count result (string) to a number.
 * @param {{ count: string | number } | undefined} row - Result row.
 * @returns {number} Count.
 */
const toCount = (row) => Number(row?.count || 0);

/**
 * SQL for a short "Bond paper, A4 · 5" style summary of a request's items.
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @returns {import('knex').Knex.Raw} Subquery selecting `item_summary`.
 */
const requestItemSummary = (trx) =>
  trx.raw(
    `(select string_agg(i.name || ' · ' || ri.requested_quantity, ', ' order by ri.id)
        from inventory_request_items ri
        join items i on i.id = ri.item_id
       where ri.request_id = inventory_requests.id) as item_summary`,
  );

/**
 * SQL for a short "Laptop · PROP-2024-0012" style summary of a borrow record's items.
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @returns {import('knex').Knex.Raw} Subquery selecting `item_summary`.
 */
const borrowItemSummary = (trx) =>
  trx.raw(
    `(select string_agg(i.name || coalesce(' · ' || iu.property_no, ''), ', ' order by bi.id)
        from borrow_record_items bi
        join items i on i.id = bi.item_id
        left join item_units iu on iu.id = bi.item_unit_id
       where bi.borrow_record_id = borrow_records.id) as item_summary`,
  );

/**
 * Counts users with a given account status.
 * @param {string} status - Account status.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} Count.
 */
export const countUsersByStatus = async (status, trx = db) =>
  toCount(
    await trx('users').where({ status }).whereNull('deleted_at').count('id as count').first(),
  );

/**
 * Lists the newest pending registrations.
 * @param {number} limit - Max rows.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<Array<{ id: number, fullName: string, positionName: string, createdAt: string }>>} Pending users.
 */
export const listPendingUsers = async (limit, trx = db) => {
  const rows = await trx('users')
    .leftJoin('positions', 'positions.id', 'users.position_id')
    .where('users.status', 'pending')
    .whereNull('users.deleted_at')
    .orderBy('users.created_at', 'desc')
    .orderBy('users.id', 'desc')
    .limit(limit)
    .select('users.id', 'users.full_name', 'positions.name as position_name', 'users.created_at');

  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    positionName: row.position_name,
    createdAt: row.created_at,
  }));
};

/**
 * Counts requests by status, optionally only one user's requests.
 * @param {{ statuses: string[], requestedBy?: number }} filters - Filters.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} Count.
 */
export const countRequests = async ({ statuses, requestedBy }, trx = db) => {
  const query = trx('inventory_requests').whereIn('status', statuses);

  if (requestedBy) {
    query.where('requested_by', requestedBy);
  }

  return toCount(await query.count('id as count').first());
};

/**
 * Lists recent requests with requester name and an item summary.
 * @param {{ statuses?: string[], requestedBy?: number, limit: number }} filters - Filters.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<Array<{ id: number, requestType: string, status: string, requesterName: string, itemSummary: string | null, neededAt: string | null, dueAt: string | null, rejectionReason: string | null, createdAt: string }>>} Requests.
 */
export const listRecentRequests = async ({ statuses, requestedBy, limit }, trx = db) => {
  const query = trx('inventory_requests')
    .join('users', 'users.id', 'inventory_requests.requested_by')
    .orderBy('inventory_requests.created_at', 'desc')
    .orderBy('inventory_requests.id', 'desc')
    .limit(limit)
    .select(
      'inventory_requests.id',
      'inventory_requests.request_type',
      'inventory_requests.status',
      'users.full_name as requester_name',
      'inventory_requests.needed_at',
      'inventory_requests.due_at',
      'inventory_requests.rejection_reason',
      'inventory_requests.created_at',
      requestItemSummary(trx),
    );

  if (statuses) {
    query.whereIn('inventory_requests.status', statuses);
  }

  if (requestedBy) {
    query.where('inventory_requests.requested_by', requestedBy);
  }

  const rows = await query;

  return rows.map((row) => ({
    id: row.id,
    requestType: row.request_type,
    status: row.status,
    requesterName: row.requester_name,
    itemSummary: row.item_summary,
    neededAt: row.needed_at,
    dueAt: row.due_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
  }));
};

/**
 * Base query for active items at or below their reorder level (AGENTS.md §9 low stock).
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @returns {import('knex').Knex.QueryBuilder} Query builder.
 */
const lowStockQuery = (trx) =>
  trx('items')
    .whereNull('items.deleted_at')
    .whereRaw('items.quantity_on_hand <= items.reorder_level');

/**
 * Counts low-stock items.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} Count.
 */
export const countLowStockItems = async (trx = db) =>
  toCount(await lowStockQuery(trx).count('items.id as count').first());

/**
 * Lists low-stock items, lowest stock first.
 * @param {number} limit - Max rows.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<Array<{ id: number, name: string, quantityOnHand: number, reorderLevel: number, unitName: string }>>} Items.
 */
export const listLowStockItems = async (limit, trx = db) => {
  const rows = await lowStockQuery(trx)
    .join('units', 'units.id', 'items.unit_id')
    .orderBy('items.quantity_on_hand', 'asc')
    .orderBy('items.name', 'asc')
    .limit(limit)
    .select(
      'items.id',
      'items.name',
      'items.quantity_on_hand',
      'items.reorder_level',
      'units.name as unit_name',
    );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    quantityOnHand: row.quantity_on_hand,
    reorderLevel: row.reorder_level,
    unitName: row.unit_name,
  }));
};

/**
 * Base query for borrow records not yet returned, optionally for one borrower.
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @param {number} [borrowerId] - Borrower user ID.
 * @returns {import('knex').Knex.QueryBuilder} Query builder.
 */
const activeBorrowQuery = (trx, borrowerId) => {
  const query = trx('borrow_records').where('borrow_records.status', 'borrowed');

  if (borrowerId) {
    query.where('borrow_records.borrower_id', borrowerId);
  }

  return query;
};

/**
 * Counts active (not returned) borrow records.
 * @param {{ borrowerId?: number }} filters - Filters.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} Count.
 */
export const countActiveBorrows = async ({ borrowerId }, trx = db) =>
  toCount(await activeBorrowQuery(trx, borrowerId).count('borrow_records.id as count').first());

/**
 * Counts overdue borrow records (due date passed, not returned).
 * @param {{ borrowerId?: number }} filters - Filters.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} Count.
 */
export const countOverdueBorrows = async ({ borrowerId }, trx = db) =>
  toCount(
    await activeBorrowQuery(trx, borrowerId)
      .where('borrow_records.due_at', '<', trx.fn.now())
      .count('borrow_records.id as count')
      .first(),
  );

/**
 * Counts borrow records due within the next `days` days (not yet overdue).
 * @param {{ borrowerId?: number, days: number }} filters - Filters.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} Count.
 */
export const countDueSoonBorrows = async ({ borrowerId, days }, trx = db) =>
  toCount(
    await activeBorrowQuery(trx, borrowerId)
      .where('borrow_records.due_at', '>=', trx.fn.now())
      .whereRaw("borrow_records.due_at < now() + (? * interval '1 day')", [days])
      .count('borrow_records.id as count')
      .first(),
  );

/**
 * Lists active borrow records with borrower name and item summary, soonest due first.
 * @param {{ borrowerId?: number, overdueOnly?: boolean, limit: number }} filters - Filters.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<Array<{ id: number, borrowerName: string, itemSummary: string | null, dueAt: string, borrowedAt: string }>>} Borrow records.
 */
export const listActiveBorrows = async ({ borrowerId, overdueOnly, limit }, trx = db) => {
  const query = activeBorrowQuery(trx, borrowerId)
    .join('users', 'users.id', 'borrow_records.borrower_id')
    .orderBy('borrow_records.due_at', 'asc')
    .orderBy('borrow_records.id', 'asc')
    .limit(limit)
    .select(
      'borrow_records.id',
      'users.full_name as borrower_name',
      'borrow_records.due_at',
      'borrow_records.borrowed_at',
      borrowItemSummary(trx),
    );

  if (overdueOnly) {
    query.where('borrow_records.due_at', '<', trx.fn.now());
  }

  const rows = await query;

  return rows.map((row) => ({
    id: row.id,
    borrowerName: row.borrower_name,
    itemSummary: row.item_summary,
    dueAt: row.due_at,
    borrowedAt: row.borrowed_at,
  }));
};
