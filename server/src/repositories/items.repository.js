import { db } from '../config/db.js';

/**
 * @typedef {Object} ItemRecord
 * @property {number} id - Item ID.
 * @property {string} code - Unique item code.
 * @property {string} name - Item name.
 * @property {number} itemTypeId - Item type ID.
 * @property {string} itemTypeName - Item type name.
 * @property {'supply' | 'equipment'} kind - From the item type.
 * @property {'quantity' | 'unit'} trackingMode - From the item type.
 * @property {number | null} maxBorrowDays - From the item type.
 * @property {boolean} isTypeActive - Whether the item type is active.
 * @property {number | null} categoryId - Category ID.
 * @property {string | null} categoryName - Category name.
 * @property {number} unitId - Unit of measure ID.
 * @property {string} unitName - Unit of measure name.
 * @property {number | null} locationId - Location ID.
 * @property {string | null} locationName - Location name.
 * @property {number} quantityOnHand - Available quantity.
 * @property {number} reorderLevel - Low-stock threshold.
 * @property {Object<string, *>} attributes - Custom item-level values.
 * @property {string} createdAt - ISO timestamp.
 * @property {string} updatedAt - ISO timestamp.
 */

/**
 * @typedef {Object} ItemUnitRecord
 * @property {number} id - Unit ID.
 * @property {number} itemId - Item ID.
 * @property {string} propertyNo - Property number.
 * @property {string | null} serialNo - Serial number.
 * @property {string} condition - Condition note.
 * @property {'available' | 'borrowed' | 'under_repair' | 'lost' | 'disposed'} status - Status.
 * @property {Object<string, *>} attributes - Custom per-unit values.
 * @property {string} updatedAt - ISO timestamp.
 */

/** Columns selected for items, joined with type, category, unit and location names. */
const ITEM_COLUMNS = [
  'items.id',
  'items.code',
  'items.name',
  'items.item_type_id',
  'item_types.name as item_type_name',
  'item_types.kind',
  'item_types.tracking_mode',
  'item_types.max_borrow_days',
  'item_types.is_active as is_type_active',
  'items.category_id',
  'categories.name as category_name',
  'items.unit_id',
  'units.name as unit_name',
  'items.location_id',
  'locations.name as location_name',
  'items.quantity_on_hand',
  'items.reorder_level',
  'items.attributes',
  'items.created_at',
  'items.updated_at',
];

/**
 * Maps an item row to the API shape.
 * @param {Object | undefined} row - Database row.
 * @returns {ItemRecord | null} Item, or null.
 */
const toItem = (row) =>
  row
    ? {
        id: row.id,
        code: row.code,
        name: row.name,
        itemTypeId: row.item_type_id,
        itemTypeName: row.item_type_name,
        kind: row.kind,
        trackingMode: row.tracking_mode,
        maxBorrowDays: row.max_borrow_days,
        isTypeActive: row.is_type_active,
        categoryId: row.category_id,
        categoryName: row.category_name,
        unitId: row.unit_id,
        unitName: row.unit_name,
        locationId: row.location_id,
        locationName: row.location_name,
        quantityOnHand: row.quantity_on_hand,
        reorderLevel: row.reorder_level,
        attributes: row.attributes || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;

/**
 * Maps an item unit row to the API shape.
 * @param {Object} row - Database row.
 * @returns {ItemUnitRecord} Unit.
 */
const toUnit = (row) => ({
  id: row.id,
  itemId: row.item_id,
  propertyNo: row.property_no,
  serialNo: row.serial_no,
  condition: row.condition,
  status: row.status,
  attributes: row.attributes || {},
  updatedAt: row.updated_at,
});

/**
 * Base query for items that are not soft-deleted, with lookup names joined.
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @returns {import('knex').Knex.QueryBuilder} Query builder.
 */
const baseQuery = (trx) =>
  trx('items')
    .join('item_types', 'item_types.id', 'items.item_type_id')
    .join('units', 'units.id', 'items.unit_id')
    .leftJoin('categories', 'categories.id', 'items.category_id')
    .leftJoin('locations', 'locations.id', 'items.location_id')
    .whereNull('items.deleted_at');

/**
 * Applies list filters to an items query.
 * @param {import('knex').Knex.QueryBuilder} query - Query to filter.
 * @param {{ search?: string, itemTypeId?: number, categoryId?: number, locationId?: number, kind?: string, trackingMode?: string, lowStockOnly?: boolean, availableOnly?: boolean }} filters - Filters.
 * @returns {import('knex').Knex.QueryBuilder} The same query.
 */
const applyFilters = (query, filters) => {
  if (filters.search) {
    query.where((builder) =>
      builder
        .whereILike('items.name', `%${filters.search}%`)
        .orWhereILike('items.code', `%${filters.search}%`),
    );
  }

  if (filters.itemTypeId) {
    query.where('items.item_type_id', filters.itemTypeId);
  }

  if (filters.categoryId) {
    query.where('items.category_id', filters.categoryId);
  }

  if (filters.locationId) {
    query.where('items.location_id', filters.locationId);
  }

  if (filters.kind) {
    query.where('item_types.kind', filters.kind);
  }

  if (filters.trackingMode) {
    query.where('item_types.tracking_mode', filters.trackingMode);
  }

  if (filters.lowStockOnly) {
    query.whereRaw('items.quantity_on_hand <= items.reorder_level');
  }

  if (filters.availableOnly) {
    query.where('items.quantity_on_hand', '>', 0).where('item_types.is_active', true);
  }

  return query;
};

/**
 * Lists items with filters, sorting and pagination.
 * @param {Object} filters - See `applyFilters`.
 * @param {{ column: string, order: 'asc' | 'desc' }} sort - Whitelisted sort.
 * @param {{ pageSize: number, offset: number }} pagination - Page window.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<{ rows: ItemRecord[], total: number }>} Page of items and total count.
 */
export const list = async (filters, sort, pagination, trx = db) => {
  const countRow = await applyFilters(baseQuery(trx), filters).count('items.id as count').first();

  const rows = await applyFilters(baseQuery(trx), filters)
    .select(ITEM_COLUMNS)
    .orderBy(sort.column, sort.order)
    .orderBy('items.id', 'asc')
    .limit(pagination.pageSize)
    .offset(pagination.offset);

  return { rows: rows.map(toItem), total: Number(countRow.count) };
};

/**
 * Finds an item by ID.
 * @param {number} id - Item ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<ItemRecord | null>} Item or null.
 */
export const findById = async (id, trx = db) =>
  toItem(await baseQuery(trx).select(ITEM_COLUMNS).where('items.id', id).first());

/**
 * Finds an item and locks its row with SELECT ... FOR UPDATE so concurrent stock changes
 * wait for this transaction (AGENTS.md §9).
 * @param {number} id - Item ID.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<ItemRecord | null>} Item or null.
 */
export const findByIdForUpdate = async (id, trx) => {
  await trx('items').select('id').where({ id }).forUpdate();

  return findById(id, trx);
};

/**
 * Finds several items by ID (not deleted).
 * @param {number[]} ids - Item IDs.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<ItemRecord[]>} Items found.
 */
export const findByIds = async (ids, trx = db) =>
  (await baseQuery(trx).select(ITEM_COLUMNS).whereIn('items.id', ids)).map(toItem);

/**
 * Checks whether another item already uses this code (case-insensitive, deleted included).
 * @param {string} code - Item code.
 * @param {number | null} excludeId - Item to ignore when editing.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<boolean>} True when taken.
 */
export const codeExists = async (code, excludeId, trx = db) => {
  const query = trx('items').whereRaw('lower(code) = lower(?)', [code]);

  if (excludeId) {
    query.whereNot('id', excludeId);
  }

  return Boolean(await query.first('id'));
};

/**
 * Inserts an item.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} New item ID.
 */
export const create = async (data, trx = db) => {
  const [row] = await trx('items').insert(data).returning('id');

  return row.id;
};

/**
 * Updates an item and bumps updated_at.
 * @param {number} id - Item ID.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<void>}
 */
export const update = async (id, data, trx = db) => {
  await trx('items')
    .where({ id })
    .update({ ...data, updated_at: trx.fn.now() });
};

/**
 * Adds a signed amount to an item's quantity on hand. Call only together with a ledger entry
 * in the same transaction (AGENTS.md §9).
 * @param {number} id - Item ID.
 * @param {number} delta - Amount to add (negative to remove).
 * @param {number} userId - User making the change.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<void>}
 */
export const adjustQuantity = async (id, delta, userId, trx) => {
  await trx('items')
    .where({ id })
    .update({
      quantity_on_hand: trx.raw('quantity_on_hand + ?', [delta]),
      updated_by: userId,
      updated_at: trx.fn.now(),
    });
};

/**
 * Soft-deletes an item.
 * @param {number} id - Item ID.
 * @param {number} userId - User deleting it.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<void>}
 */
export const softDelete = async (id, userId, trx = db) => {
  await trx('items')
    .where({ id })
    .update({ deleted_at: trx.fn.now(), updated_by: userId, updated_at: trx.fn.now() });
};

/**
 * Counts requests that still need this item (pending or approved, not yet released).
 * @param {number} itemId - Item ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} Count.
 */
export const countOpenRequests = async (itemId, trx = db) => {
  const row = await trx('inventory_request_items')
    .join('inventory_requests', 'inventory_requests.id', 'inventory_request_items.request_id')
    .where('inventory_request_items.item_id', itemId)
    .whereIn('inventory_requests.status', ['pending', 'approved'])
    .count('inventory_request_items.id as count')
    .first();

  return Number(row.count);
};

/**
 * Counts borrowed pieces of this item that are not yet returned.
 * @param {number} itemId - Item ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} Count.
 */
export const countUnreturnedBorrows = async (itemId, trx = db) => {
  const row = await trx('borrow_record_items')
    .where({ item_id: itemId })
    .whereNull('returned_at')
    .count('id as count')
    .first();

  return Number(row.count);
};

/**
 * Lists the units of an item ordered by property number.
 * @param {number} itemId - Item ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<ItemUnitRecord[]>} Units.
 */
export const listUnits = async (itemId, trx = db) =>
  (
    await trx('item_units')
      .where({ item_id: itemId })
      .orderBy('property_no')
      .select(
        'id',
        'item_id',
        'property_no',
        'serial_no',
        'condition',
        'status',
        'attributes',
        'updated_at',
      )
  ).map(toUnit);

/**
 * Finds units by ID and locks them (use inside a transaction).
 * @param {number[]} unitIds - Unit IDs.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<ItemUnitRecord[]>} Units found.
 */
export const findUnitsForUpdate = async (unitIds, trx) =>
  (await trx('item_units').whereIn('id', unitIds).forUpdate().select('*')).map(toUnit);

/**
 * Checks whether another unit already uses this property number (case-insensitive).
 * @param {string} propertyNo - Property number.
 * @param {number | null} excludeId - Unit to ignore when editing.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<boolean>} True when taken.
 */
export const propertyNoExists = async (propertyNo, excludeId, trx = db) => {
  const query = trx('item_units').whereRaw('lower(property_no) = lower(?)', [propertyNo]);

  if (excludeId) {
    query.whereNot('id', excludeId);
  }

  return Boolean(await query.first('id'));
};

/**
 * Inserts a unit.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} New unit ID.
 */
export const createUnit = async (data, trx = db) => {
  const [row] = await trx('item_units').insert(data).returning('id');

  return row.id;
};

/**
 * Updates units and bumps updated_at.
 * @param {number[]} unitIds - Unit IDs.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<void>}
 */
export const updateUnits = async (unitIds, data, trx = db) => {
  await trx('item_units')
    .whereIn('id', unitIds)
    .update({ ...data, updated_at: trx.fn.now() });
};
