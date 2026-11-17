import { db } from '../config/db.js';

/**
 * @typedef {Object} BorrowRecordItemRecord
 * @property {number} id - Borrow record item ID.
 * @property {number} itemId - Item ID.
 * @property {string} itemCode - Item code.
 * @property {string} itemName - Item name.
 * @property {string} unitName - Unit of measure.
 * @property {'quantity' | 'unit'} trackingMode - From the item type.
 * @property {number | null} itemUnitId - Unit ID (unit-tracked items).
 * @property {string | null} propertyNo - Unit property number.
 * @property {number} quantity - Quantity borrowed.
 * @property {'good' | 'damaged' | 'lost' | null} returnCondition - Condition on return.
 * @property {string | null} returnedAt - ISO timestamp.
 * @property {string | null} remarks - Return note.
 */

/**
 * @typedef {Object} BorrowRecordRecord
 * @property {number} id - Borrow record ID.
 * @property {number} requestId - Source request.
 * @property {number} borrowerId - Borrower user ID.
 * @property {string} borrowerName - Borrower name.
 * @property {string} borrowedAt - ISO timestamp.
 * @property {string} dueAt - ISO timestamp.
 * @property {string | null} returnedAt - ISO timestamp.
 * @property {'borrowed' | 'returned'} status - Status.
 * @property {boolean} isOverdue - Due date passed and not returned.
 * @property {string | null} issuedByName - Who released it.
 * @property {string | null} receivedByName - Who received the return.
 * @property {string | null} itemSummary - Short summary of the items.
 */

/** Columns selected for borrow records. */
const RECORD_COLUMNS = [
  'borrow_records.id',
  'borrow_records.request_id',
  'borrow_records.borrower_id',
  'borrower.full_name as borrower_name',
  'borrow_records.borrowed_at',
  'borrow_records.due_at',
  'borrow_records.returned_at',
  'borrow_records.status',
  'issuer.full_name as issued_by_name',
  'receiver.full_name as received_by_name',
];

/**
 * SQL that marks a record overdue: still borrowed and past its due date.
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @returns {import('knex').Knex.Raw} Expression selecting `is_overdue`.
 */
const isOverdueColumn = (trx) =>
  trx.raw("(borrow_records.status = 'borrowed' and borrow_records.due_at < now()) as is_overdue");

/**
 * SQL for a short "Laptop · PROP-2024-0012, Volleyball × 2" summary of a record's items.
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @returns {import('knex').Knex.Raw} Subquery selecting `item_summary`.
 */
const itemSummary = (trx) =>
  trx.raw(
    `(select string_agg(i.name || coalesce(' · ' || iu.property_no, case when bi.quantity > 1 then ' × ' || bi.quantity else '' end), ', ' order by bi.id)
        from borrow_record_items bi
        join items i on i.id = bi.item_id
        left join item_units iu on iu.id = bi.item_unit_id
       where bi.borrow_record_id = borrow_records.id) as item_summary`,
  );

/**
 * Maps a borrow record row to the API shape.
 * @param {Object | undefined} row - Database row.
 * @returns {BorrowRecordRecord | null} Record, or null.
 */
const toRecord = (row) =>
  row
    ? {
        id: row.id,
        requestId: row.request_id,
        borrowerId: row.borrower_id,
        borrowerName: row.borrower_name,
        borrowedAt: row.borrowed_at,
        dueAt: row.due_at,
        returnedAt: row.returned_at,
        status: row.status,
        isOverdue: Boolean(row.is_overdue),
        issuedByName: row.issued_by_name,
        receivedByName: row.received_by_name,
        itemSummary: row.item_summary,
      }
    : null;

/**
 * Base query with borrower, issuer and receiver names joined.
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @returns {import('knex').Knex.QueryBuilder} Query builder.
 */
const baseQuery = (trx) =>
  trx('borrow_records')
    .join('users as borrower', 'borrower.id', 'borrow_records.borrower_id')
    .leftJoin('users as issuer', 'issuer.id', 'borrow_records.issued_by')
    .leftJoin('users as receiver', 'receiver.id', 'borrow_records.received_by');

/**
 * Applies list filters.
 * @param {import('knex').Knex.QueryBuilder} query - Query.
 * @param {{ status?: 'borrowed' | 'returned' | 'overdue', borrowerId?: number, search?: string }} filters - Filters.
 * @returns {import('knex').Knex.QueryBuilder} The same query.
 */
const applyFilters = (query, filters) => {
  if (filters.status === 'overdue') {
    query
      .where('borrow_records.status', 'borrowed')
      .where('borrow_records.due_at', '<', db.fn.now());
  } else if (filters.status) {
    query.where('borrow_records.status', filters.status);
  }

  if (filters.borrowerId) {
    query.where('borrow_records.borrower_id', filters.borrowerId);
  }

  if (filters.search) {
    query.where((builder) =>
      builder.whereILike('borrower.full_name', `%${filters.search}%`).orWhereExists(
        db('borrow_record_items as bi')
          .join('items as i', 'i.id', 'bi.item_id')
          .leftJoin('item_units as iu', 'iu.id', 'bi.item_unit_id')
          .whereRaw('bi.borrow_record_id = borrow_records.id')
          .where((inner) =>
            inner
              .whereILike('i.name', `%${filters.search}%`)
              .orWhereILike('iu.property_no', `%${filters.search}%`),
          ),
      ),
    );
  }

  return query;
};

/**
 * Lists borrow records (not returned first, soonest due first), with pagination.
 * @param {Object} filters - See `applyFilters`.
 * @param {{ pageSize: number, offset: number }} pagination - Page window.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<{ rows: BorrowRecordRecord[], total: number }>} Page and total.
 */
export const list = async (filters, pagination, trx = db) => {
  const countRow = await applyFilters(baseQuery(trx), filters)
    .count('borrow_records.id as count')
    .first();

  const rows = await applyFilters(baseQuery(trx), filters)
    .select([...RECORD_COLUMNS, isOverdueColumn(trx), itemSummary(trx)])
    .orderByRaw("case when borrow_records.status = 'borrowed' then 0 else 1 end")
    .orderBy('borrow_records.due_at', 'asc')
    .orderBy('borrow_records.id', 'desc')
    .limit(pagination.pageSize)
    .offset(pagination.offset);

  return { rows: rows.map(toRecord), total: Number(countRow.count) };
};

/**
 * Lists every borrow record matching the filters (for report exports).
 * @param {Object} filters - See `applyFilters`.
 * @param {number} limit - Safety cap on rows.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<BorrowRecordRecord[]>} Records.
 */
export const listAll = async (filters, limit, trx = db) =>
  (
    await applyFilters(baseQuery(trx), filters)
      .select([...RECORD_COLUMNS, isOverdueColumn(trx), itemSummary(trx)])
      .orderBy('borrow_records.due_at', 'asc')
      .limit(limit)
  ).map(toRecord);

/**
 * Finds a borrow record by ID.
 * @param {number} id - Borrow record ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<BorrowRecordRecord | null>} Record or null.
 */
export const findById = async (id, trx = db) =>
  toRecord(
    await baseQuery(trx)
      .select([...RECORD_COLUMNS, isOverdueColumn(trx), itemSummary(trx)])
      .where('borrow_records.id', id)
      .first(),
  );

/**
 * Finds a borrow record and locks its row (use inside a transaction).
 * @param {number} id - Borrow record ID.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<BorrowRecordRecord | null>} Record or null.
 */
export const findByIdForUpdate = async (id, trx) => {
  await trx('borrow_records').select('id').where({ id }).forUpdate();

  return findById(id, trx);
};

/**
 * Finds the borrow record created from a request.
 * @param {number} requestId - Request ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<BorrowRecordRecord | null>} Record or null.
 */
export const findByRequestId = async (requestId, trx = db) =>
  toRecord(
    await baseQuery(trx)
      .select([...RECORD_COLUMNS, isOverdueColumn(trx), itemSummary(trx)])
      .where('borrow_records.request_id', requestId)
      .first(),
  );

/**
 * Lists a borrow record's items with item and unit details.
 * @param {number} borrowRecordId - Borrow record ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<BorrowRecordItemRecord[]>} Items.
 */
export const listItems = async (borrowRecordId, trx = db) => {
  const rows = await trx('borrow_record_items')
    .join('items', 'items.id', 'borrow_record_items.item_id')
    .join('item_types', 'item_types.id', 'items.item_type_id')
    .join('units', 'units.id', 'items.unit_id')
    .leftJoin('item_units', 'item_units.id', 'borrow_record_items.item_unit_id')
    .where('borrow_record_items.borrow_record_id', borrowRecordId)
    .orderBy('borrow_record_items.id')
    .select(
      'borrow_record_items.id',
      'borrow_record_items.item_id',
      'items.code as item_code',
      'items.name as item_name',
      'units.name as unit_name',
      'item_types.tracking_mode',
      'borrow_record_items.item_unit_id',
      'item_units.property_no',
      'borrow_record_items.quantity',
      'borrow_record_items.return_condition',
      'borrow_record_items.returned_at',
      'borrow_record_items.remarks',
    );

  return rows.map((row) => ({
    id: row.id,
    itemId: row.item_id,
    itemCode: row.item_code,
    itemName: row.item_name,
    unitName: row.unit_name,
    trackingMode: row.tracking_mode,
    itemUnitId: row.item_unit_id,
    propertyNo: row.property_no,
    quantity: row.quantity,
    returnCondition: row.return_condition,
    returnedAt: row.returned_at,
    remarks: row.remarks,
  }));
};

/**
 * Inserts a borrow record.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<number>} New record ID.
 */
export const create = async (data, trx) => {
  const [row] = await trx('borrow_records').insert(data).returning('id');

  return row.id;
};

/**
 * Inserts one borrow record item.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<number>} New item ID.
 */
export const createItem = async (data, trx) => {
  const [row] = await trx('borrow_record_items').insert(data).returning('id');

  return row.id;
};

/**
 * Updates a borrow record and bumps updated_at.
 * @param {number} id - Borrow record ID.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<void>}
 */
export const update = async (id, data, trx) => {
  await trx('borrow_records')
    .where({ id })
    .update({ ...data, updated_at: trx.fn.now() });
};

/**
 * Updates one borrow record item.
 * @param {number} id - Borrow record item ID.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<void>}
 */
export const updateItem = async (id, data, trx) => {
  await trx('borrow_record_items').where({ id }).update(data);
};

/**
 * Lists unreturned borrow records due within a time window (for due-soon reminders).
 * @param {{ fromDate: string, toDate: string }} window - Manila dates; due on or after `fromDate` and before the day after `toDate`.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<Array<{ id: number, borrowerId: number, dueAt: string, itemSummary: string | null }>>} Records.
 */
export const listDueBetween = async ({ fromDate, toDate }, trx = db) => {
  const rows = await trx('borrow_records')
    .where('status', 'borrowed')
    .where('due_at', '>=', fromDate)
    .whereRaw("due_at < (?::date + interval '1 day')", [toDate])
    .where('due_at', '>=', trx.fn.now())
    .select('id', 'borrower_id', 'due_at', itemSummary(trx));

  return rows.map((row) => ({
    id: row.id,
    borrowerId: row.borrower_id,
    dueAt: row.due_at,
    itemSummary: row.item_summary,
  }));
};

/**
 * Lists unreturned borrow records whose due date has passed (for overdue reminders).
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<Array<{ id: number, borrowerId: number, dueAt: string, itemSummary: string | null }>>} Records.
 */
export const listOverdue = async (trx = db) => {
  const rows = await trx('borrow_records')
    .where('status', 'borrowed')
    .where('due_at', '<', trx.fn.now())
    .select('id', 'borrower_id', 'due_at', itemSummary(trx));

  return rows.map((row) => ({
    id: row.id,
    borrowerId: row.borrower_id,
    dueAt: row.due_at,
    itemSummary: row.item_summary,
  }));
};
