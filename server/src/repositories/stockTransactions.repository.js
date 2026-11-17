import { db } from '../config/db.js';

/**
 * @typedef {Object} StockTransactionRecord
 * @property {number} id - Ledger entry ID.
 * @property {number} itemId - Item ID.
 * @property {string} itemCode - Item code.
 * @property {string} itemName - Item name.
 * @property {string} unitName - Unit of measure.
 * @property {number | null} itemUnitId - Unit ID (unit-tracked items).
 * @property {string | null} propertyNo - Unit property number.
 * @property {string} type - Transaction type.
 * @property {number} quantity - Signed quantity.
 * @property {string | null} referenceType - What caused it.
 * @property {number | null} referenceId - ID of what caused it.
 * @property {string | null} remarks - Reason or note.
 * @property {number} performedBy - User ID.
 * @property {string} performedByName - User name.
 * @property {string} createdAt - ISO timestamp.
 */

/**
 * Inserts a ledger entry. Every quantity change must write one in the same transaction as the
 * `items.quantity_on_hand` update (AGENTS.md §9).
 * @param {{ itemId: number, itemUnitId?: number | null, type: string, quantity: number, referenceType?: string | null, referenceId?: number | null, remarks?: string | null, performedBy: number }} entry - Entry.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<number>} New entry ID.
 */
export const create = async (entry, trx) => {
  const [row] = await trx('stock_transactions')
    .insert({
      item_id: entry.itemId,
      item_unit_id: entry.itemUnitId || null,
      type: entry.type,
      quantity: entry.quantity,
      reference_type: entry.referenceType || null,
      reference_id: entry.referenceId || null,
      remarks: entry.remarks || null,
      performed_by: entry.performedBy,
    })
    .returning('id');

  return Number(row.id);
};

/**
 * Counts an item's ledger entries.
 * @param {number} itemId - Item ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} Count.
 */
export const countByItem = async (itemId, trx = db) =>
  Number(
    (await trx('stock_transactions').where({ item_id: itemId }).count('id as count').first()).count,
  );

/**
 * Base ledger query with item, unit and user names joined.
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @returns {import('knex').Knex.QueryBuilder} Query builder.
 */
const baseQuery = (trx) =>
  trx('stock_transactions')
    .join('items', 'items.id', 'stock_transactions.item_id')
    .join('units', 'units.id', 'items.unit_id')
    .join('users', 'users.id', 'stock_transactions.performed_by')
    .leftJoin('item_units', 'item_units.id', 'stock_transactions.item_unit_id');

/**
 * Applies ledger filters. Dates are Manila calendar dates (the session timezone).
 * @param {import('knex').Knex.QueryBuilder} query - Query.
 * @param {{ itemId?: number, type?: string, dateFrom?: string, dateTo?: string, search?: string }} filters - Filters.
 * @returns {import('knex').Knex.QueryBuilder} The same query.
 */
const applyFilters = (query, filters) => {
  if (filters.itemId) {
    query.where('stock_transactions.item_id', filters.itemId);
  }

  if (filters.type) {
    query.where('stock_transactions.type', filters.type);
  }

  if (filters.dateFrom) {
    query.where('stock_transactions.created_at', '>=', filters.dateFrom);
  }

  if (filters.dateTo) {
    query.whereRaw("stock_transactions.created_at < (?::date + interval '1 day')", [
      filters.dateTo,
    ]);
  }

  if (filters.search) {
    query.where((builder) =>
      builder
        .whereILike('items.name', `%${filters.search}%`)
        .orWhereILike('items.code', `%${filters.search}%`)
        .orWhereILike('item_units.property_no', `%${filters.search}%`),
    );
  }

  return query;
};

/**
 * Maps a ledger row to the API shape.
 * @param {Object} row - Database row.
 * @returns {StockTransactionRecord} Entry.
 */
const toTransaction = (row) => ({
  id: Number(row.id),
  itemId: row.item_id,
  itemCode: row.item_code,
  itemName: row.item_name,
  unitName: row.unit_name,
  itemUnitId: row.item_unit_id,
  propertyNo: row.property_no,
  type: row.type,
  quantity: row.quantity,
  referenceType: row.reference_type,
  referenceId: row.reference_id,
  remarks: row.remarks,
  performedBy: row.performed_by,
  performedByName: row.performed_by_name,
  createdAt: row.created_at,
});

/** Columns selected for ledger rows. */
const TRANSACTION_COLUMNS = [
  'stock_transactions.id',
  'stock_transactions.item_id',
  'items.code as item_code',
  'items.name as item_name',
  'units.name as unit_name',
  'stock_transactions.item_unit_id',
  'item_units.property_no',
  'stock_transactions.type',
  'stock_transactions.quantity',
  'stock_transactions.reference_type',
  'stock_transactions.reference_id',
  'stock_transactions.remarks',
  'stock_transactions.performed_by',
  'users.full_name as performed_by_name',
  'stock_transactions.created_at',
];

/**
 * Lists ledger entries, newest first, with pagination.
 * @param {Object} filters - See `applyFilters`.
 * @param {{ pageSize: number, offset: number }} pagination - Page window.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<{ rows: StockTransactionRecord[], total: number }>} Page and total.
 */
export const list = async (filters, pagination, trx = db) => {
  const countRow = await applyFilters(baseQuery(trx), filters)
    .count('stock_transactions.id as count')
    .first();

  const rows = await applyFilters(baseQuery(trx), filters)
    .select(TRANSACTION_COLUMNS)
    .orderBy('stock_transactions.created_at', 'desc')
    .orderBy('stock_transactions.id', 'desc')
    .limit(pagination.pageSize)
    .offset(pagination.offset);

  return { rows: rows.map(toTransaction), total: Number(countRow.count) };
};

/**
 * Lists every ledger entry matching the filters (for report exports), oldest first.
 * @param {Object} filters - See `applyFilters`.
 * @param {number} limit - Safety cap on rows.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<StockTransactionRecord[]>} Entries.
 */
export const listAll = async (filters, limit, trx = db) =>
  (
    await applyFilters(baseQuery(trx), filters)
      .select(TRANSACTION_COLUMNS)
      .orderBy('stock_transactions.created_at', 'asc')
      .orderBy('stock_transactions.id', 'asc')
      .limit(limit)
  ).map(toTransaction);

/**
 * Finds items whose quantity on hand does not match the ledger, or (for unit-tracked items)
 * the number of available units (AGENTS.md §9 reconcile check).
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<Array<{ id: number, code: string, name: string, trackingMode: string, quantityOnHand: number, ledgerQuantity: number, availableUnits: number | null }>>} Mismatched items.
 */
export const listMismatches = async (trx = db) => {
  const rows = await trx('items')
    .join('item_types', 'item_types.id', 'items.item_type_id')
    .whereNull('items.deleted_at')
    .select(
      'items.id',
      'items.code',
      'items.name',
      'items.quantity_on_hand',
      'item_types.tracking_mode',
      trx.raw(
        '(select coalesce(sum(st.quantity), 0) from stock_transactions st where st.item_id = items.id) as ledger_quantity',
      ),
      trx.raw(
        "(select count(*) from item_units iu where iu.item_id = items.id and iu.status = 'available') as available_units",
      ),
    );

  return rows
    .map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      trackingMode: row.tracking_mode,
      quantityOnHand: row.quantity_on_hand,
      ledgerQuantity: Number(row.ledger_quantity),
      availableUnits: row.tracking_mode === 'unit' ? Number(row.available_units) : null,
    }))
    .filter(
      (item) =>
        item.quantityOnHand !== item.ledgerQuantity ||
        (item.availableUnits !== null && item.quantityOnHand !== item.availableUnits),
    );
};
