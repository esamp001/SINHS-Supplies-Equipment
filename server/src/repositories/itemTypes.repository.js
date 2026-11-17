import { db } from '../config/db.js';

/**
 * @typedef {Object} ItemTypeField
 * @property {number} id - Field ID.
 * @property {number} itemTypeId - Owning item type.
 * @property {string} key - Attribute key stored in `attributes` (never changes once used).
 * @property {string} label - Display label.
 * @property {'text' | 'number' | 'date' | 'boolean' | 'select'} dataType - Value type.
 * @property {string[] | null} options - Allowed values for `select`.
 * @property {boolean} isRequired - Whether a value is required.
 * @property {'item' | 'unit'} appliesTo - Stored on the item or on each unit.
 * @property {number} sortOrder - Display order.
 * @property {boolean} isActive - Inactive fields are hidden from forms but keep their values.
 */

/**
 * @typedef {Object} ItemType
 * @property {number} id - Item type ID.
 * @property {string} name - Name, e.g. "Laptop".
 * @property {'supply' | 'equipment'} kind - Supplies are consumed; equipment is borrowed.
 * @property {'quantity' | 'unit'} trackingMode - Count only, or each piece tracked.
 * @property {number | null} maxBorrowDays - Borrow limit in days (equipment only).
 * @property {boolean} isActive - Inactive types can't be used for new items.
 * @property {number} itemCount - Items of this type (including soft-deleted).
 * @property {ItemTypeField[]} fields - Custom fields, in display order.
 */

/**
 * Maps a field row to the API shape.
 * @param {Object} row - Database row.
 * @returns {ItemTypeField} Field.
 */
const toField = (row) => ({
  id: row.id,
  itemTypeId: row.item_type_id,
  key: row.key,
  label: row.label,
  dataType: row.data_type,
  options: row.options,
  isRequired: row.is_required,
  appliesTo: row.applies_to,
  sortOrder: row.sort_order,
  isActive: row.is_active,
});

/**
 * Maps an item type row (without fields) to the API shape.
 * @param {Object} row - Database row.
 * @returns {Omit<ItemType, 'fields'>} Item type.
 */
const toItemType = (row) => ({
  id: row.id,
  name: row.name,
  kind: row.kind,
  trackingMode: row.tracking_mode,
  maxBorrowDays: row.max_borrow_days,
  isActive: row.is_active,
  itemCount: Number(row.item_count || 0),
});

/**
 * Base select for item types with the number of items using each type.
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @returns {import('knex').Knex.QueryBuilder} Query builder.
 */
const baseQuery = (trx) =>
  trx('item_types').select(
    'item_types.id',
    'item_types.name',
    'item_types.kind',
    'item_types.tracking_mode',
    'item_types.max_borrow_days',
    'item_types.is_active',
    trx('items').count('*').whereRaw('items.item_type_id = item_types.id').as('item_count'),
  );

/**
 * Lists the fields of one or more item types in display order.
 * @param {number[]} itemTypeIds - Item type IDs.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<ItemTypeField[]>} Fields.
 */
export const listFieldsByTypeIds = async (itemTypeIds, trx = db) => {
  if (!itemTypeIds.length) {
    return [];
  }

  const rows = await trx('item_type_fields')
    .whereIn('item_type_id', itemTypeIds)
    .orderBy('sort_order')
    .orderBy('id')
    .select(
      'id',
      'item_type_id',
      'key',
      'label',
      'data_type',
      'options',
      'is_required',
      'applies_to',
      'sort_order',
      'is_active',
    );

  return rows.map(toField);
};

/**
 * Attaches each type's fields.
 * @param {Array<Omit<ItemType, 'fields'>>} itemTypes - Item types.
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @returns {Promise<ItemType[]>} Item types with fields.
 */
const withFields = async (itemTypes, trx) => {
  const fields = await listFieldsByTypeIds(
    itemTypes.map((itemType) => itemType.id),
    trx,
  );

  return itemTypes.map((itemType) => ({
    ...itemType,
    fields: fields.filter((field) => field.itemTypeId === itemType.id),
  }));
};

/**
 * Lists item types with their fields, ordered by name.
 * @param {{ activeOnly?: boolean }} filters - Filters.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<ItemType[]>} Item types.
 */
export const list = async ({ activeOnly }, trx = db) => {
  const query = baseQuery(trx).orderBy('item_types.name');

  if (activeOnly) {
    query.where('item_types.is_active', true);
  }

  return withFields((await query).map(toItemType), trx);
};

/**
 * Finds an item type with its fields.
 * @param {number} id - Item type ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<ItemType | null>} Item type or null.
 */
export const findById = async (id, trx = db) => {
  const row = await baseQuery(trx).where('item_types.id', id).first();

  if (!row) {
    return null;
  }

  const [itemType] = await withFields([toItemType(row)], trx);

  return itemType;
};

/**
 * Finds an item type and locks its row (use inside a transaction).
 * @param {number} id - Item type ID.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<ItemType | null>} Item type or null.
 */
export const findByIdForUpdate = async (id, trx) => {
  await trx('item_types').select('id').where({ id }).forUpdate();

  return findById(id, trx);
};

/**
 * Checks whether another item type already has this name (case-insensitive).
 * @param {string} name - Name.
 * @param {number | null} excludeId - Type to ignore when renaming.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<boolean>} True when taken.
 */
export const nameExists = async (name, excludeId, trx = db) => {
  const query = trx('item_types').whereRaw('lower(name) = lower(?)', [name]);

  if (excludeId) {
    query.whereNot('id', excludeId);
  }

  return Boolean(await query.first('id'));
};

/**
 * Inserts an item type.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} New ID.
 */
export const create = async (data, trx = db) => {
  const [row] = await trx('item_types').insert(data).returning('id');

  return row.id;
};

/**
 * Updates an item type and bumps updated_at.
 * @param {number} id - Item type ID.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<void>}
 */
export const update = async (id, data, trx = db) => {
  await trx('item_types')
    .where({ id })
    .update({ ...data, updated_at: trx.fn.now() });
};

/**
 * Deletes an unused item type (its fields are removed by ON DELETE CASCADE).
 * @param {number} id - Item type ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<void>}
 */
export const remove = async (id, trx = db) => {
  await trx('item_types').where({ id }).delete();
};

/**
 * Finds a field of an item type and locks its row.
 * @param {number} itemTypeId - Item type ID.
 * @param {number} fieldId - Field ID.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<ItemTypeField | null>} Field or null.
 */
export const findFieldForUpdate = async (itemTypeId, fieldId, trx) => {
  const row = await trx('item_type_fields')
    .where({ id: fieldId, item_type_id: itemTypeId })
    .forUpdate()
    .first();

  return row ? toField(row) : null;
};

/**
 * Checks whether a field key is already used on an item type.
 * @param {number} itemTypeId - Item type ID.
 * @param {string} key - Field key.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<boolean>} True when taken.
 */
export const fieldKeyExists = async (itemTypeId, key, trx = db) =>
  Boolean(await trx('item_type_fields').where({ item_type_id: itemTypeId, key }).first('id'));

/**
 * Returns the highest sort order on an item type (0 when it has no fields).
 * @param {number} itemTypeId - Item type ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} Highest sort order.
 */
export const maxFieldSortOrder = async (itemTypeId, trx = db) => {
  const row = await trx('item_type_fields')
    .where({ item_type_id: itemTypeId })
    .max('sort_order as max')
    .first();

  return Number(row?.max || 0);
};

/**
 * Inserts a field.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} New field ID.
 */
export const createField = async (data, trx = db) => {
  const [row] = await trx('item_type_fields').insert(data).returning('id');

  return row.id;
};

/**
 * Updates a field and bumps updated_at.
 * @param {number} fieldId - Field ID.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<void>}
 */
export const updateField = async (fieldId, data, trx = db) => {
  await trx('item_type_fields')
    .where({ id: fieldId })
    .update({ ...data, updated_at: trx.fn.now() });
};

/**
 * Deletes a field that has no stored values.
 * @param {number} fieldId - Field ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<void>}
 */
export const removeField = async (fieldId, trx = db) => {
  await trx('item_type_fields').where({ id: fieldId }).delete();
};

/**
 * Base query over the rows that store values for a field (items or their units).
 * @param {{ itemTypeId: number, key: string, appliesTo: 'item' | 'unit' }} field - Field.
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @returns {{ query: import('knex').Knex.QueryBuilder, column: string }} Query and attributes column.
 */
const fieldValuesQuery = ({ itemTypeId, key, appliesTo }, trx) => {
  if (appliesTo === 'unit') {
    return {
      query: trx('item_units')
        .join('items', 'items.id', 'item_units.item_id')
        .where('items.item_type_id', itemTypeId)
        .whereRaw('item_units.attributes \\? ?', [key]),
      column: 'item_units.attributes',
    };
  }

  return {
    query: trx('items')
      .where('items.item_type_id', itemTypeId)
      .whereRaw('items.attributes \\? ?', [key]),
    column: 'items.attributes',
  };
};

/**
 * Counts items (or units) that have a stored value for a field.
 * @param {{ itemTypeId: number, key: string, appliesTo: 'item' | 'unit' }} field - Field.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} Count.
 */
export const countFieldValues = async (field, trx = db) => {
  const { query } = fieldValuesQuery(field, trx);

  return Number((await query.count('* as count').first()).count);
};

/**
 * Counts items (or units) whose value for a field is one of the given select options.
 * @param {{ itemTypeId: number, key: string, appliesTo: 'item' | 'unit' }} field - Field.
 * @param {string[]} values - Option values.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} Count.
 */
export const countFieldValuesIn = async (field, values, trx = db) => {
  if (!values.length) {
    return 0;
  }

  const { query, column } = fieldValuesQuery(field, trx);

  const row = await query
    .whereRaw(`(${column} ->> ?) = any(?)`, [field.key, values])
    .count('* as count')
    .first();

  return Number(row.count);
};
