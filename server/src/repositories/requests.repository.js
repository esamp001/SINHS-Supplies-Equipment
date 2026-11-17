import { db } from '../config/db.js';

/**
 * @typedef {Object} RequestItemRecord
 * @property {number} id - Request item ID.
 * @property {number} itemId - Item ID.
 * @property {string} itemCode - Item code.
 * @property {string} itemName - Item name.
 * @property {string} unitName - Unit of measure.
 * @property {'supply' | 'equipment'} kind - From the item type.
 * @property {'quantity' | 'unit'} trackingMode - From the item type.
 * @property {number | null} maxBorrowDays - From the item type.
 * @property {number} quantityOnHand - Current available stock.
 * @property {number} requestedQuantity - Requested.
 * @property {number | null} approvedQuantity - Approved.
 * @property {number | null} releasedQuantity - Released.
 * @property {string | null} remarks - Custodian remark.
 */

/**
 * @typedef {Object} RequestRecord
 * @property {number} id - Request ID.
 * @property {'supply' | 'borrow'} requestType - Request type.
 * @property {string} status - Workflow status.
 * @property {number} requestedBy - Requester user ID.
 * @property {string} requesterName - Requester name.
 * @property {string | null} purpose - Purpose.
 * @property {string | null} neededAt - Needed date ('YYYY-MM-DD').
 * @property {string | null} dueAt - Return due timestamp (borrow only).
 * @property {number | null} reviewedBy - Reviewer user ID.
 * @property {string | null} reviewerName - Reviewer name.
 * @property {string | null} reviewedAt - ISO timestamp.
 * @property {string | null} rejectionReason - Reason when rejected.
 * @property {string | null} releasedByName - Who released it.
 * @property {string | null} releasedAt - ISO timestamp.
 * @property {string | null} itemSummary - Short summary of the items.
 * @property {string} createdAt - ISO timestamp.
 */

/** Columns selected for requests. */
const REQUEST_COLUMNS = [
  'inventory_requests.id',
  'inventory_requests.request_type',
  'inventory_requests.status',
  'inventory_requests.requested_by',
  'requester.full_name as requester_name',
  'inventory_requests.purpose',
  'inventory_requests.needed_at',
  'inventory_requests.due_at',
  'inventory_requests.reviewed_by',
  'reviewer.full_name as reviewer_name',
  'inventory_requests.reviewed_at',
  'inventory_requests.rejection_reason',
  'releaser.full_name as released_by_name',
  'inventory_requests.released_at',
  'inventory_requests.created_at',
];

/**
 * SQL for a short "Bond paper, A4 × 5, Ballpen × 2" summary of a request's items.
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @returns {import('knex').Knex.Raw} Subquery selecting `item_summary`.
 */
const itemSummary = (trx) =>
  trx.raw(
    `(select string_agg(i.name || ' × ' || coalesce(ri.approved_quantity, ri.requested_quantity), ', ' order by ri.id)
        from inventory_request_items ri
        join items i on i.id = ri.item_id
       where ri.request_id = inventory_requests.id) as item_summary`,
  );

/**
 * Maps a request row to the API shape.
 * @param {Object | undefined} row - Database row.
 * @returns {RequestRecord | null} Request, or null.
 */
const toRequest = (row) =>
  row
    ? {
        id: row.id,
        requestType: row.request_type,
        status: row.status,
        requestedBy: row.requested_by,
        requesterName: row.requester_name,
        purpose: row.purpose,
        neededAt: row.needed_at,
        dueAt: row.due_at,
        reviewedBy: row.reviewed_by,
        reviewerName: row.reviewer_name,
        reviewedAt: row.reviewed_at,
        rejectionReason: row.rejection_reason,
        releasedByName: row.released_by_name,
        releasedAt: row.released_at,
        itemSummary: row.item_summary,
        createdAt: row.created_at,
      }
    : null;

/**
 * Base request query with requester, reviewer and releaser names joined.
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @returns {import('knex').Knex.QueryBuilder} Query builder.
 */
const baseQuery = (trx) =>
  trx('inventory_requests')
    .join('users as requester', 'requester.id', 'inventory_requests.requested_by')
    .leftJoin('users as reviewer', 'reviewer.id', 'inventory_requests.reviewed_by')
    .leftJoin('users as releaser', 'releaser.id', 'inventory_requests.released_by');

/**
 * Applies list filters.
 * @param {import('knex').Knex.QueryBuilder} query - Query.
 * @param {{ statuses?: string[], requestType?: string, requestedBy?: number, search?: string, dateFrom?: string, dateTo?: string }} filters - Filters.
 * @returns {import('knex').Knex.QueryBuilder} The same query.
 */
const applyFilters = (query, filters) => {
  if (filters.statuses?.length) {
    query.whereIn('inventory_requests.status', filters.statuses);
  }

  if (filters.requestType) {
    query.where('inventory_requests.request_type', filters.requestType);
  }

  if (filters.requestedBy) {
    query.where('inventory_requests.requested_by', filters.requestedBy);
  }

  if (filters.dateFrom) {
    query.where('inventory_requests.created_at', '>=', filters.dateFrom);
  }

  if (filters.dateTo) {
    query.whereRaw("inventory_requests.created_at < (?::date + interval '1 day')", [
      filters.dateTo,
    ]);
  }

  if (filters.search) {
    query.where((builder) =>
      builder
        .whereILike('requester.full_name', `%${filters.search}%`)
        .orWhereILike('inventory_requests.purpose', `%${filters.search}%`)
        .orWhereRaw('inventory_requests.id::text = ?', [filters.search]),
    );
  }

  return query;
};

/**
 * Lists requests, newest first, with pagination.
 * @param {Object} filters - See `applyFilters`.
 * @param {{ pageSize: number, offset: number }} pagination - Page window.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<{ rows: RequestRecord[], total: number }>} Page and total.
 */
export const list = async (filters, pagination, trx = db) => {
  const countRow = await applyFilters(baseQuery(trx), filters)
    .count('inventory_requests.id as count')
    .first();

  const rows = await applyFilters(baseQuery(trx), filters)
    .select([...REQUEST_COLUMNS, itemSummary(trx)])
    .orderBy('inventory_requests.created_at', 'desc')
    .orderBy('inventory_requests.id', 'desc')
    .limit(pagination.pageSize)
    .offset(pagination.offset);

  return { rows: rows.map(toRequest), total: Number(countRow.count) };
};

/**
 * Lists every request matching the filters (for report exports), newest first.
 * @param {Object} filters - See `applyFilters`.
 * @param {number} limit - Safety cap on rows.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<RequestRecord[]>} Requests.
 */
export const listAll = async (filters, limit, trx = db) =>
  (
    await applyFilters(baseQuery(trx), filters)
      .select([...REQUEST_COLUMNS, itemSummary(trx)])
      .orderBy('inventory_requests.created_at', 'desc')
      .limit(limit)
  ).map(toRequest);

/**
 * Finds a request by ID.
 * @param {number} id - Request ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<RequestRecord | null>} Request or null.
 */
export const findById = async (id, trx = db) =>
  toRequest(
    await baseQuery(trx)
      .select([...REQUEST_COLUMNS, itemSummary(trx)])
      .where('inventory_requests.id', id)
      .first(),
  );

/**
 * Finds a request and locks its row (use inside a transaction).
 * @param {number} id - Request ID.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<RequestRecord | null>} Request or null.
 */
export const findByIdForUpdate = async (id, trx) => {
  await trx('inventory_requests').select('id').where({ id }).forUpdate();

  return findById(id, trx);
};

/**
 * Lists a request's items with item details and current stock.
 * @param {number} requestId - Request ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<RequestItemRecord[]>} Request items.
 */
export const listItems = async (requestId, trx = db) => {
  const rows = await trx('inventory_request_items')
    .join('items', 'items.id', 'inventory_request_items.item_id')
    .join('item_types', 'item_types.id', 'items.item_type_id')
    .join('units', 'units.id', 'items.unit_id')
    .where('inventory_request_items.request_id', requestId)
    .orderBy('inventory_request_items.id')
    .select(
      'inventory_request_items.id',
      'inventory_request_items.item_id',
      'items.code as item_code',
      'items.name as item_name',
      'units.name as unit_name',
      'item_types.kind',
      'item_types.tracking_mode',
      'item_types.max_borrow_days',
      'items.quantity_on_hand',
      'inventory_request_items.requested_quantity',
      'inventory_request_items.approved_quantity',
      'inventory_request_items.released_quantity',
      'inventory_request_items.remarks',
    );

  return rows.map((row) => ({
    id: row.id,
    itemId: row.item_id,
    itemCode: row.item_code,
    itemName: row.item_name,
    unitName: row.unit_name,
    kind: row.kind,
    trackingMode: row.tracking_mode,
    maxBorrowDays: row.max_borrow_days,
    quantityOnHand: row.quantity_on_hand,
    requestedQuantity: row.requested_quantity,
    approvedQuantity: row.approved_quantity,
    releasedQuantity: row.released_quantity,
    remarks: row.remarks,
  }));
};

/**
 * Inserts a request.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<number>} New request ID.
 */
export const create = async (data, trx) => {
  const [row] = await trx('inventory_requests').insert(data).returning('id');

  return row.id;
};

/**
 * Inserts request items.
 * @param {Array<Object>} rows - Snake_case column values per item.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<void>}
 */
export const createItems = async (rows, trx) => {
  await trx('inventory_request_items').insert(rows);
};

/**
 * Updates a request and bumps updated_at.
 * @param {number} id - Request ID.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<void>}
 */
export const update = async (id, data, trx) => {
  await trx('inventory_requests')
    .where({ id })
    .update({ ...data, updated_at: trx.fn.now() });
};

/**
 * Updates one request item.
 * @param {number} requestItemId - Request item ID.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<void>}
 */
export const updateItem = async (requestItemId, data, trx) => {
  await trx('inventory_request_items').where({ id: requestItemId }).update(data);
};
